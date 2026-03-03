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
 * FFmpegを使って画像フォーマットを変換する。
 * JPEG, PNG, WebP への出力に対応。
 *
 * @param inputUri     入力画像のファイルURI
 * @param options      変換オプション（出力フォーマット、品質）
 */
export async function convertImage(
  inputUri: string,
  options: ConvertOptions,
): Promise<FfmpegConvertResult> {
  const { outputFormat, quality = 85 } = options;

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
  const suffix = Date.now();
  const outputUri = `${cacheDir}${stem}_converted_${suffix}${ext}`;
  const outputPath = outputUri.replace('file://', '');

  // フォーマット別のFFmpegオプションを構築
  let qualityArgs: string;
  switch (outputFormat) {
    case 'jpeg':
      // FFmpeg の -q:v は 1(最高)〜31(最低)。quality(0-100)を変換。
      // quality=100 → q:v=2, quality=0 → q:v=31
      const qv = Math.round(2 + (100 - quality) * 29 / 100);
      qualityArgs = `-q:v ${qv}`;
      break;
    case 'png':
      // PNG はロスレス。-compression_level 0-9 (デフォルト6)
      qualityArgs = '-compression_level 6';
      break;
    case 'webp':
      qualityArgs = `-quality ${Math.max(0, Math.min(100, quality))}`;
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
    throw new Error(`FFmpegフォーマット変換に失敗しました: ${logs}`);
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
