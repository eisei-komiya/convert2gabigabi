import { NativeModules } from 'react-native';

const { GabiGabi } = NativeModules;

/**
 * Rust ネイティブモジュール（GabiGabi）が利用可能かどうかを返す。
 */
export function isRustAvailable(): boolean {
  return !!GabiGabi;
}

/**
 * Rust ネイティブモジュール経由で画像をガビガビ化する。
 * FFmpegだけでは実現しにくい高精度な色量子化・ピクセル劣化処理に使用する。
 *
 * @param inputUri      入力画像のファイルURI
 * @param scalePct      縮小率（1〜100 %）
 * @param gabigabiLevel ガビガビレベル（1〜5）
 * @returns 出力画像のファイルURI
 */
export async function processWithRust(
  inputUri: string,
  scalePct: number,
  gabigabiLevel: number = 2,
): Promise<string> {
  if (!GabiGabi) {
    throw new Error('RustBridge: GabiGabi ネイティブモジュールが見つかりません');
  }
  return GabiGabi.resizeGabigabi(inputUri, scalePct, gabigabiLevel) as Promise<string>;
}
