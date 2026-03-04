import { FFmpegKit, FFprobeKit, ReturnCode } from 'ffmpeg-kit-react-native';
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
 * FFmpegのログから実際のエラーメッセージを抽出する。
 * バージョンバナーや設定情報を除き、エラー行のみ返す。
 */
function extractErrorFromLogs(logs: string): string {
  const errorLines = logs
    .split('\n')
    .filter(line => {
      const lower = line.toLowerCase();
      return (
        lower.includes('error') ||
        lower.includes('invalid') ||
        lower.includes('no such file') ||
        lower.includes('not found') ||
        lower.includes('failed') ||
        lower.includes('unable') ||
        lower.includes('cannot') ||
        lower.includes('unrecognized') ||
        lower.includes('unknown')
      );
    })
    .filter(line => !line.startsWith('ffmpeg version') && !line.startsWith('  '))
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (errorLines.length > 0) {
    return errorLines.slice(0, 3).join(' | ');
  }

  const trimmed = logs.trim();
  return trimmed.length > 200 ? '...' + trimmed.slice(-200) : trimmed;
}

/**
 * FFprobeKitを使って動画の長さ（秒）を取得する。
 */
async function getVideoDurationSec(inputPath: string): Promise<number> {
  const session = await FFprobeKit.execute(
    `-v quiet -print_format json -show_entries format=duration "${inputPath}"`,
  );
  const output = await session.getOutput();
  try {
    const parsed = JSON.parse(output ?? '{}');
    const duration = parseFloat(parsed?.format?.duration ?? '0');
    if (!duration || isNaN(duration)) {
      throw new Error('動画の長さを取得できませんでした');
    }
    return duration;
  } catch {
    throw new Error('動画の長さを取得できませんでした');
  }
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
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // 圧縮はJPEG出力（-q:v による品質制御が有効なフォーマット）
  const outputUri = `${cacheDir}${stem}_compressed_${suffix}.jpg`;
  const outputPath = outputUri.replace('file://', '');

  let lo = 1;
  let hi = 31; // FFmpeg -q:v range: 1 (best) to 31 (worst)
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
      const logs = await session.getAllLogsAsString();
      const errorSummary = extractErrorFromLogs(logs);
      throw new Error(`FFmpeg画像圧縮に失敗しました: ${errorSummary}`);
    }

    const outInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
    const outBytes = (outInfo as FileSystem.FileInfo & { size: number }).size ?? 0;

    if (outBytes <= targetBytes) {
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
      const logs = await session.getAllLogsAsString();
      const errorSummary = extractErrorFromLogs(logs);
      throw new Error(`FFmpeg画像圧縮（スケールダウン）に失敗しました: ${errorSummary}`);
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
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    const logs = await session.getAllLogsAsString();
    const errorSummary = extractErrorFromLogs(logs);
    throw new Error(`FFmpeg動画圧縮に失敗しました: ${errorSummary}`);
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
