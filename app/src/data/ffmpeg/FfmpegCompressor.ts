import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system';

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
 * FFmpegを使って動画の長さ（秒）を取得する。
 */
async function getVideoDurationSec(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    FFmpegKitConfig.enableLogCallback(undefined);
    FFmpegKit.execute(`-i "${inputPath}" -hide_banner`)
      .then(async (session) => {
        const logs = await session.getAllLogsAsString();
        const match = logs.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (match) {
          const h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const s = parseFloat(match[3]);
          resolve(h * 3600 + m * 60 + s);
        } else {
          reject(new Error('動画の長さを取得できませんでした'));
        }
      })
      .catch(reject);
  });
}

/**
 * 画像を指定バイト数以下に圧縮する（JPEG品質をバイナリサーチ）。
 *
 * @param inputUri    入力画像ファイルURI
 * @param targetBytes 目標ファイルサイズ（バイト）
 */
async function compressImageToTarget(
  inputUri: string,
  targetBytes: number,
): Promise<CompressResult> {
  const inputPath = inputUri.replace('file://', '');
  const info = await FileSystem.getInfoAsync(inputUri, { size: true });
  const originalBytes = (info as FileSystem.FileInfo & { size: number }).size ?? 0;

  if (originalBytes <= targetBytes) {
    return {
      outputUri: inputUri,
      outputBytes: originalBytes,
      compressionRatio: 1,
    };
  }

  const stem = inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'image';
  const cacheDir = FileSystem.cacheDirectory ?? 'file:///tmp/';
  const suffix = Date.now();
  const outputUri = `${cacheDir}${stem}_discord_${suffix}.jpg`;
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
  const inputPath = inputUri.replace('file://', '');
  const info = await FileSystem.getInfoAsync(inputUri, { size: true });
  const originalBytes = (info as FileSystem.FileInfo & { size: number }).size ?? 0;

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
  const cacheDir = FileSystem.cacheDirectory ?? 'file:///tmp/';
  const suffix = Date.now();
  const outputUri = `${cacheDir}${stem}_discord_${suffix}.mp4`;
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
    const logs = await session.getAllLogsAsString();
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
    return compressImageToTarget(inputUri, DISCORD_MAX_BYTES);
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
