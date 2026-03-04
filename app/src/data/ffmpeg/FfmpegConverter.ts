import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system';

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface ConvertOptions {
  outputFormat: ImageFormat;
  quality?: number; // 0-100, jpeg/webp only (ignored for png)
}

export interface FfmpegConvertResult {
  outputUri: string;
  outputBytes: number;
}

/**
 * FFmpegのログから実際のエラーメッセージを抽出する。
 * バージョンバナーや設定情報を除き、ERROR/error行のみ返す。
 */
function extractErrorFromLogs(logs: string): string {
  // エラー行を抽出（"Error", "error:", "Invalid", "No such file" など）
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
    // バージョンバナーや設定行は除外
    .filter(line => !line.startsWith('ffmpeg version') && !line.startsWith('  '))
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (errorLines.length > 0) {
    return errorLines.slice(0, 3).join(' | ');
  }

  // エラー行が見つからない場合はログの末尾30文字を返す
  const trimmed = logs.trim();
  return trimmed.length > 200 ? '...' + trimmed.slice(-200) : trimmed;
}

/**
 * FFmpegを使って画像フォーマットを変換する。
 * JPEG, PNG への出力に対応。
 * WebP は ffmpeg-kit-main-16kb パッケージに libwebp が含まれていないため非対応。
 *
 * @param inputUri     入力画像のファイルURI
 * @param options      変換オプション（出力フォーマット、品質）
 */
export async function convertImage(
  inputUri: string,
  options: ConvertOptions,
): Promise<FfmpegConvertResult> {
  const { outputFormat, quality = 85 } = options;

  // WebP エンコードには libwebp が必要だが、ffmpeg-kit-main-16kb には含まれていない
  if (outputFormat === 'webp') {
    throw new Error(
      'WebP形式への変換はサポートされていません。\n' +
      '使用中のFFmpegビルド (ffmpeg-kit-main-16kb) にはlibwebpが含まれていないため、' +
      'WebPエンコードができません。\n' +
      'JPEG形式またはPNG形式をご使用ください。',
    );
  }

  const inputPath = inputUri.replace('file://', '');
  const fileName = inputPath.split('/').pop() ?? 'image';
  const stem = fileName.replace(/\.[^.]+$/, '');

  const extMap: Record<ImageFormat, string> = {
    jpeg: '.jpg',
    png: '.png',
    webp: '.webp',
  };
  const ext = extMap[outputFormat];
  const cacheDir = FileSystem.cacheDirectory ?? 'file:///tmp/';
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const outputUri = `${cacheDir}${stem}_converted_${suffix}${ext}`;
  const outputPath = outputUri.replace('file://', '');

  // フォーマット別のFFmpegオプションを構築
  let qualityArgs: string;
  switch (outputFormat) {
    case 'jpeg': {
      // FFmpeg の -q:v は 1(最高)〜31(最低)。quality(0-100)を変換。
      // quality=100 → q:v=2, quality=0 → q:v=31
      const qv = Math.round(2 + (100 - quality) * 29 / 100);
      qualityArgs = `-q:v ${qv}`;
      break;
    }
    case 'png':
      // PNG はロスレス。-compression_level 0-9 (デフォルト6)
      qualityArgs = '-compression_level 6';
      break;
    default:
      qualityArgs = '';
  }

  const cmd = [
    '-y',
    '-i', `"${inputPath}"`,
    qualityArgs,
    `"${outputPath}"`,
  ].join(' ');

  const session = await FFmpegKit.execute(cmd);
  const rc = await session.getReturnCode();

  if (!ReturnCode.isSuccess(rc)) {
    const logs = await session.getAllLogsAsString();
    const errorSummary = extractErrorFromLogs(logs);
    throw new Error(`FFmpegフォーマット変換に失敗しました: ${errorSummary}`);
  }

  const info = await FileSystem.getInfoAsync(outputUri, { size: true });
  if (!info.exists) {
    throw new Error('FFmpeg出力ファイルが見つかりません');
  }
  return {
    outputUri,
    outputBytes: (info as FileSystem.FileInfo & { size: number }).size ?? 0,
  };
}
