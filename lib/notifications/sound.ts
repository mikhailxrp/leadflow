const SOUND_SRC = '/sounds/notification.mp3';
const SOUND_VOLUME = 0.5;

let element: HTMLAudioElement | null = null;

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  if (!element) {
    element = new Audio(SOUND_SRC);
    element.preload = 'auto';
    element.volume = SOUND_VOLUME;
  }

  return element;
}

/**
 * Проигрывает звук нового лида. Экземпляр Audio один на вкладку и
 * перематывается в начало: при пачке лидов подряд звук перезапускается,
 * а не накладывается сам на себя десятком копий.
 *
 * Молча игнорирует отказ play() — браузер отклоняет автовоспроизведение,
 * пока пользователь ни разу не взаимодействовал со вкладкой (autoplay policy).
 * Это штатное состояние свежеоткрытой вкладки, а не ошибка.
 */
export function playNotificationSound(): void {
  const audio = getAudioElement();
  if (!audio) return;

  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}
