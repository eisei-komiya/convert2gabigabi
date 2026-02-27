import { processWithFfmpeg } from '../data/ffmpeg/FfmpegProcessor';
import { processWithRust, isRustAvailable } from '../data/native/RustBridge';

export interface ResizeResult {
  outputUri: string;
  engine: 'ffmpeg' | 'rust';
}

/**
 * 画像リサイズのUseCase。
 * FFmpegを優先し、失敗した場合はRustネイティブモジュールにフォールバックする。
 *
 * @param inputUri      入力画像のファイルURI
 * @param scalePct      縮小率（1〜100 %）
 * @param gabigabiLevel ガビガビレベル（1〜5）
 */
export async function resizeImage(
  inputUri: string,
  scalePct: number,
  gabigabiLevel: number = 2,
): Promise<ResizeResult> {
  try {
    const result = await processWithFfmpeg(inputUri, scalePct, gabigabiLevel);
    return { outputUri: result.outputUri, engine: 'ffmpeg' };
  } catch (ffmpegErr) {
    console.warn('FFmpeg処理に失敗、Rustへフォールバック:', ffmpegErr);
    if (!isRustAvailable()) {
      throw new Error('FFmpegとRustの両方が利用できません');
    }
    const outputUri = await processWithRust(inputUri, scalePct, gabigabiLevel);
    return { outputUri, engine: 'rust' };
  }
}
