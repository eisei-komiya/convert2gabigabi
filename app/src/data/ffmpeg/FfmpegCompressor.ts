import { Paths } from 'expo-file-system';
import { FFmpegKit, FFprobeKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { generateUniqueFileSuffix, extractErrorFromLogs } from './ffmpegUtils';

export interface CompressResult {
  outputUri: string;
  outputBytes: number;
  compressionRatio: number;
}

const DISCORD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * ファイルの拡張子から動画かどうかを判定する。
 */
function isVideoFile(uri: string): boolean {
  const lower = uri.toLowerCase();
  return /\.(mp4|mov|avi|mkv|webm|m4v|3gp)$/.test(lower);
}

/**
 * FFprobeKitを使って動画の長さ（秒）を取得する。
 * (#46) FFmpeg エラーログのパースから FFprobeKit.getMediaInformation() に移行。
 */
async function getVideoDurationSec(inputPath: string): Promise<number> {
  const session = await FFprobeKit.getMediaInformation(inputPath);
  const info = await session.getMediaInformation();
  if (info) {
    const duration = info.getDuration();
    if (duration != null && !isNaN(Number(duration))) {
      return Number(duration);
    }
  }
  throw new Error('動画の長さを取得できませんでした');
}

/**
 * キャッシュディレクトリ内の古い一時出力ファイル（_compressed_, _gabigabi_, _converted_ を含むもの）を削除する。
 */
async function cleanupCachedTempFiles(): Promise<void> {
  try {
    const cacheDirUri = Paths.cache.uri;
    const cacheDir = cacheDirUri.endsWith('/') ? cacheDirUri : cacheDirUri + '/';
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) return;
    const result = await FileSystem.readDirectoryAsync(cacheDir);
    const tempPattern = /_(compressed|gabigabi|converted)_/;
    await Promise.all(
      result
        .filter(name => tempPattern.test(name))
        .map(name => FileSystem.deleteAsync(cacheDir + name, { idempotent: true })),
    );
  } catch {
    // クリーンアップ失敗は無視して処理を続行する
  }
}

/**
 * 画像を指定バイト数以下に圧縮する（JPEG品質をバイナリサーチ）。
 *
 * @param inputUri    入力画像ファイルURI
 * @param targetBytes 目標ファイルサイズ（バイト）
 * @param forceJpeg   true の場合は入力形式に関わらず JPEG で出力する（Discord送信など）
 */
async function compressImageToTarget(
  inputUri: string,
  targetBytes: number,
  forceJpeg: boolean = false,
): Promise<CompressResult> {
  // 入力ファイルの存在確認とサイズチェック
  const inputInfo = await FileSystem.getInfoAsync(inputUri, { size: true });
  if (!inputInfo.exists) {
    throw new Error('入力ファイルが存在しません');
  }
  const originalBytes = (inputInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  if (originalBytes === 0) {
    throw new Error('入力ファイルが空（0バイト）です');
  }

  // 前回の一時ファイルをクリーンアップ
  await cleanupCachedTempFiles();

  const inputPath = inputUri.replace('file://', '');

  if (originalBytes <= targetBytes) {
    return {
      outputUri: inputUri,
      outputBytes: originalBytes,
      compressionRatio: 1,
    };
  }

  const stem = inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'image';
  // forceJpeg が false の場合は入力ファイルの拡張子を保持する
  const inputExt = inputPath.split('.').pop()?.toLowerCase() ?? 'jpg';
  const outputExt = forceJpeg ? 'jpg' : inputExt;
  const cacheDirUri = Paths.cache.uri;
  const cacheDir = cacheDirUri.endsWith("/") ? cacheDirUri : cacheDirUri + "/";
  const suffix = generateUniqueFileSuffix();
  const outputUri = `${cacheDir}${stem}_compressed_${suffix}.${outputExt}`;
  const outputPath = outputUri.replace('file://', '');

  let lo = 1;
  let hi = 31; // FFmpeg -q:v range: 1 (best) to 31 (worst)
  let bestQv = hi;
  let bestBytes = 0;

  // バイナリサーチで targetBytes 以下に収まる最高品質を探す
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const cmd = [
      '-y',
      '-i', `"${inputPath}"`,
      '-q:v', String(mid),
      '-update', '1',
      '-frames:v', '1',
      `"${outputPath}"`,
    ].join(' ');

    const session = await FFmpegKit.execute(cmd);
    const rc = await session.getReturnCode();
    if (!ReturnCode.isSuccess(rc)) {
      throw new Error('FFmpeg画像圧縮に失敗しました');
    }

    const outInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
    const outBytes = (outInfo as FileSystem.FileInfo & { size: number }).size ?? 0;

    if (outBytes <= targetBytes) {
      bestQv = mid;
      bestBytes = outBytes;
      hi = mid - 1; // より高品質（低い qv）を試す
    } else {
      lo = mid + 1; // さらに圧縮（高い qv）を試す
    }
  }

  if (bestBytes === 0) {
    // 最低品質でも超えてしまう場合はスケールダウンも加える
    const cmd = [
      '-y',
      '-i', `"${inputPath}"`,
      '-vf', '"scale=iw*0.5:ih*0.5"',
      '-q:v', '31',
      '-update', '1',
      '-frames:v', '1',
      `"${outputPath}"`,
    ].join(' ');
    const session = await FFmpegKit.execute(cmd);
    const rc = await session.getReturnCode();
    if (!ReturnCode.isSuccess(rc)) {
      throw new Error('FFmpeg画像圧縮（スケールダウン）に失敗しました');
    }
    const outInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
    bestBytes = (outInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  }

  return {
    outputUri,
    outputBytes: bestBytes,
    compressionRatio: originalBytes > 0 ? bestBytes / originalBytes : 1,
  };
}

/**
 * 動画を指定バイト数以下にビットレート制御で圧縮する。
 *
 * @param inputUri    入力動画ファイルURI
 * @param targetBytes 目標ファイルサイズ（バイト）
 */
async function compressVideoToTarget(
  inputUri: string,
  targetBytes: number,
): Promise<CompressResult> {
  // 入力ファイルの存在確認とサイズチェック
  const inputInfo = await FileSystem.getInfoAsync(inputUri, { size: true });
  if (!inputInfo.exists) {
    throw new Error('入力ファイルが存在しません');
  }
  const originalBytes = (inputInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  if (originalBytes === 0) {
    throw new Error('入力ファイルが空（0バイト）です');
  }

  // 前回の一時ファイルをクリーンアップ
  await cleanupCachedTempFiles();

  const inputPath = inputUri.replace('file://', '');

  if (originalBytes <= targetBytes) {
    return {
      outputUri: inputUri,
      outputBytes: originalBytes,
      compressionRatio: 1,
    };
  }

  const durationSec = await getVideoDurationSec(inputPath);
  if (durationSec <= 0) {
    throw new Error('動画の長さが取得できませんでした');
  }

  // 目標ビットレートを計算（オーバーヘッド分として 5% を引く）
  const targetBits = targetBytes * 8 * 0.95;
  const videoBitrateKbps = Math.floor(targetBits / durationSec / 1000);

  if (videoBitrateKbps < 50) {
    throw new Error('動画が長すぎて10MB以下には圧縮できません');
  }

  const stem = inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'video';
  const cacheDirUri = Paths.cache.uri;
  const cacheDir = cacheDirUri.endsWith("/") ? cacheDirUri : cacheDirUri + "/";
  const suffix = generateUniqueFileSuffix();
  const outputUri = `${cacheDir}${stem}_compressed_${suffix}.mp4`;
  const outputPath = outputUri.replace('file://', '');

  const cmd = [
    '-y',
    '-i', `"${inputPath}"`,
    '-b:v', `${videoBitrateKbps}k`,
    '-maxrate', `${videoBitrateKbps}k`,
    '-bufsize', `${videoBitrateKbps * 2}k`,
    '-c:a', 'aac',
    '-b:a', '64k',
    `"${outputPath}"`,
  ].join(' ');

  const session = await FFmpegKit.execute(cmd);
  const rc = await session.getReturnCode();
  if (!ReturnCode.isSuccess(rc)) {
    const logs = await extractErrorFromLogs(session);
    throw new Error(`FFmpeg動画圧縮に失敗しました: ${logs}`);
  }

  const outInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
  const outputBytes = (outInfo as FileSystem.FileInfo & { size: number }).size ?? 0;

  return {
    outputUri,
    outputBytes,
    compressionRatio: originalBytes > 0 ? outputBytes / originalBytes : 1,
  };
}

/**
 * Discord の10MB制限に合わせてファイルを圧縮する。
 * 画像・動画両対応。すでに10MB以下の場合は元のURIをそのまま返す。
 *
 * @param inputUri 入力ファイルのfile:// URI
 */
export async function compressForDiscord(inputUri: string): Promise<CompressResult> {
  if (isVideoFile(inputUri)) {
    return compressVideoToTarget(inputUri, DISCORD_MAX_BYTES);
  } else {
    // Discord 送信用: JPEG に変換して圧縮（互換性優先）
    return compressImageToTarget(inputUri, DISCORD_MAX_BYTES, true);
  }
}

/**
 * 任意の目標サイズにファイルを圧縮する汎用関数。
 *
 * @param inputUri    入力ファイルのfile:// URI
 * @param targetBytes 目標ファイルサイズ（バイト）
 */
export async function compressToTargetSize(
  inputUri: string,
  targetBytes: number,
): Promise<CompressResult> {
  if (isVideoFile(inputUri)) {
    return compressVideoToTarget(inputUri, targetBytes);
  } else {
    return compressImageToTarget(inputUri, targetBytes);
  }
}

