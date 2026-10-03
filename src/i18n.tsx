import { Children, cloneElement, isValidElement } from "react";
import type { ReactNode } from "react";

export type Locale = "ru" | "en";
const preferenceKey = "orbit-language-v1";

export function preferredLocale(): Locale {
  const query = new URLSearchParams(location.search).get("lang");
  if (query === "ru" || query === "en") return query;
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (saved === "ru" || saved === "en") return saved;
  } catch { /* Private browsing may block storage. */ }
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function saveLocale(locale: Locale) {
  try { localStorage.setItem(preferenceKey, locale); } catch { /* Session choice still works. */ }
  document.documentElement.lang = locale;
  const url = new URL(location.href);
  url.searchParams.set("lang", locale);
  history.replaceState(null, "", url);
}

const english: Record<string, string> = {
  // Landing and navigation
  "ORBIT — главная": "ORBIT — home",
  "Включить звук": "Turn sound on", "Выключить звук": "Turn sound off",
  "Полный экран": "Full screen", "Выйти": "Exit", "Исходный код": "Source code",
  "Персональный словарь жестов (эксперимент) ↗": "Personal gesture vocabulary (experiment) ↗",
  "КАМЕРА ВМЕСТО ДЖОЙСТИКА": "CAMERA INSTEAD OF A CONTROLLER",
  "Миссия": "The mission", "в твоих": "is in your", "руках.": "hands.",
  "Орбитальная станция потеряла связь.": "The orbital station has lost contact.",
  "Пройди 10 уровней и верни её": "Complete 10 levels and restore it",
  "в строй движениями рук.": "with your hands.",
  "Игра проверяет основу будущего интерфейса для обучения: выбрать, подтвердить, перейти дальше — с обычной веб-камерой.":
    "This game tests the building blocks of hands-free learning: select, confirm and move on using an ordinary webcam.",
  "Подключить камеру": "Connect camera", "10 уровней": "10 levels",
  "Две руки · составные действия": "Two hands · combined actions", "Без установки": "No installation",
  "Видео обрабатывается на устройстве.": "Video is processed on your device.",
  "Запись и отправка на сервер не ведутся.": "Nothing is recorded or uploaded.",
  "СВЯЗЬ ПОТЕРЯНА": "SIGNAL LOST", "Ожидаем оператора": "Awaiting operator",
  "КАМПАНИЯ / 10 УРОВНЕЙ": "CAMPAIGN / 10 LEVELS",
  "Восстанови станцию по частям.": "Restore the station, one system at a time.",
  "Пройденные уровни открывают следующие. Прогресс хранится на этом устройстве.":
    "Completing a level unlocks the next one. Progress stays on this device.",
  "Закрыт": "Locked", "Открыт": "Unlocked", "Следующий": "Next",
  "закрыт": "locked", "с": "s",
  "Выбран уровень": "Level selected", ". После обучения начнёшь с него.": ". You'll start there after practice.",
  "ПРОСТОЙ ПЛАН СПАСЕНИЯ": "YOUR MISSION PLAN",
  "Две руки. Одна миссия.": "Two hands. One mission.",
  "Сначала потренируемся.": "Practice first.",
  "Таймер включится, когда будешь готов.": "The timer starts when you're ready.",
  "Захвати": "Grab", "Большой + указательный": "Thumb + index finger",
  "Соедини пальцы и перенеси энергоячейку в порт.": "Pinch and move the power cell into its port.",
  "Заряди": "Charge", "Раскрытая ладонь": "Open palm",
  "Задержи ладонь над модулем, чтобы вернуть питание.": "Hold an open palm over the module to restore power.",
  "Расчисти": "Clear", "Взмах вправо": "Swipe right",
  "Проведи раскрытой ладонью и убери помеху.": "Sweep an open palm to clear the interference.",
  "Настрой связь": "Repair the signal", "Две руки одновременно": "Both hands together",
  "Левой рукой подбери частоту, правой тяни провод справа к центру. Раскрой обе ладони для передачи.":
    "Tune the frequency with your left hand. Pull the wire from the right to the centre with your right hand, then open both palms to transmit.",
  "НЕ СРАБОТАЛО С ПЕРВОГО РАЗА?": "DIDN'T WORK FIRST TIME?",
  "Система подскажет, что поправить.": "The system tells you what to correct.",
  "Не просто «жест не распознан», а «сблизь пальцы» или «проведи ладонью дальше вправо».":
    "Not just ‘gesture not recognized’, but ‘bring your fingertips together’ or ‘swipe farther right’.",
  "Разогни пальцы": "Straighten your fingers",
  "Для зарядки нужна раскрытая ладонь.": "Charging requires an open palm.",
  "ЗАЧЕМ МЫ ЭТО ДЕЛАЕМ": "WHY WE BUILT THIS",
  "Сначала игра. Затем — больше способов учиться.": "A game first. More ways to learn next.",
  "Сегодня эти движения чинят станцию. Та же связка «действие → распознавание → конкретная подсказка» может лечь в основу интерактивных уроков и управления учебными материалами без мыши. ORBIT — проверка первого сценария, а не обещание готового универсального решения.":
    "Today these movements repair a station. The same action → recognition → specific correction loop could power interactive lessons and mouse-free learning materials. ORBIT validates one scenario; it is not a finished universal solution.",
  "Жесты и будущие действия": "Gestures and future actions",
  "01 / ЩИПОК": "01 / PINCH", "Выбрать и переместить": "Select and move",
  "02 / ЛАДОНЬ": "02 / PALM", "Подтвердить действие": "Confirm an action",
  "03 / ВЗМАХ": "03 / SWIPE", "Перейти дальше": "Move forward",
  "Сделано командой": "Built by team",
  "Лучше начать на ноутбуке · Камера на уровне лица · Ровный свет":
    "Best on a laptop · Camera at face level · Even lighting",
  // Mission shell
  "Подключение": "Connecting", "Тренировочный полёт": "Practice flight",
  "Всё готово": "Ready", "Уровень пройден": "Level complete",
  "Итоги миссии": "Mission results",
  "ПРОЙДЕН": "COMPLETE", "работает.": "is online.",
  "Следующая цель —": "Next objective:",
  "Обучение": "Practice",
  "ОПЕРАЦИЯ / ВОССТАНОВЛЕНИЕ СТАНЦИИ": "OPERATION / STATION RECOVERY",
  "УРОВЕНЬ": "LEVEL", "ОЧКИ": "SCORE", "ПАУЗА": "PAUSED",
  "ОСТАТОК": "REMAINING", "ВРЕМЯ": "TIME", "ОБУЧЕНИЕ": "PRACTICE",
  "Этапы восстановления": "Repair steps", "СЕРИЯ": "COMBO",
  "Не получилось подключиться": "Could not connect", "Подключаем камеру…": "Connecting camera…",
  "Первый запуск может занять немного времени: загружаем модель распознавания.":
    "The first start may take a moment while the hand-tracking model loads.",
  "Попробовать снова": "Try again", "Вернуться на главную": "Back to home",
  "ПОДКЛЮЧЕНИЕ": "CONNECTING", "КАМЕРА НЕДОСТУПНА": "CAMERA UNAVAILABLE",
  "ПОПРАВЬ ДВИЖЕНИЕ": "ADJUST YOUR MOVEMENT", "БОРТОВОЙ ПОМОЩНИК": "ONBOARD GUIDE",
  "МИССИЯ ЗАВЕРШЕНА": "MISSION COMPLETE", "ВРЕМЯ ВЫШЛО": "TIME IS UP",
  "Станция восстановлена. Посмотри результат или начни новую кампанию.":
    "The station is restored. Review your result or start a new campaign.",
  "Время уровня вышло. Покажи раскрытую ладонь на кнопке повтора.":
    "This level's timer ran out. Hold an open palm over the retry button.",
  "Браузер не разрешил сохранить рекорд или открытый уровень. Результат этой миссии показан выше.":
    "The browser could not save your record or unlocked level. Your result is shown above.",
  "Твоя камера": "Your camera", "Отключена": "Disconnected",
  "Рука в кадре": "Hand in frame", "Ищем руку": "Looking for a hand",
  "Покажи руку": "Show your hand", "Щипок": "Pinch", "Обе руки видны": "Both hands visible",
  "Рука видна": "Hand visible", "Нет сигнала": "No signal",
  "Первый шаг сделан": "The first step is done",
  "Движения двух рук позволяют пройти задачу без клавиатуры. В учебном интерфейсе они могут стать такими действиями:":
    "Two-hand movements let you complete the task without a keyboard. In a learning interface, they could become these actions:",
  "Выбрать объект": "Select an object", "Ладонь": "Palm", "Подтвердить": "Confirm",
  "Взмах": "Swipe", "Две руки": "Two hands", "Настроить параметр и объект одновременно": "Adjust a parameter and an object at once",
  "Следующий этап — проверить эти действия в реальном уроке.":
    "Next, test these actions in a real lesson.",
  "Управление": "Controls", "Видеопоток остаётся в браузере. Для выхода и отключения камеры нажми «Выйти».":
    "Video stays in your browser. Select ‘Exit’ to stop the camera.",
  "Курсор следует за рукой · Играй сидя · Для сигнала нужны обе руки":
    "Cursor follows your hand · You can play seated · Signal repair needs both hands",
  "Личный рекорд": "Personal best",
  // Board
  "ЭНЕРГОЯЧЕЙКА": "POWER CELL", "Ложный порт": "False port", "ЛОЖНЫЙ ПОРТ": "FALSE PORT",
  "ПОТОКОВ ОСТАЛОСЬ:": "LANES REMAINING:",
  "ПОРТ": "PORT", "Проведи вправо": "Swipe right", "ВОССТАНОВИ СВЯЗЬ": "REPAIR THE SIGNAL",
  "ЛЕВАЯ · ЧАСТОТА / ПРАВАЯ · ПРОВОД СПРАВА → ЦЕНТР":
    "LEFT · FREQUENCY / RIGHT · WIRE FROM RIGHT → CENTRE",
  "Настройка частоты левой рукой": "Tune frequency with your left hand",
  "ВЫСОКАЯ": "HIGH", "НИЗКАЯ": "LOW", "ЛИНИЯ": "LINE", "СВЯЗЬ": "SIGNAL",
  "РАЗЪЁМ": "SOCKET", "01 · НАСТРОЙ": "01 · TUNE", "02 · СОЕДИНИ": "02 · CONNECT",
  "03 · ПЕРЕДАЙ": "03 · TRANSMIT", "Установим связь": "Let's establish a connection",
  "Раскрой одну ладонь перед камерой.": "Open one palm in front of the camera.",
  "Подержи её в центре около секунды.": "Hold it in the centre for about a second.",
  "калибровка": "calibration",
  "ОБУЧЕНИЕ ПРОЙДЕНО": "PRACTICE COMPLETE", "Миссия в твоих руках.": "The mission is in your hands.",
  "10 уровней. У каждого свой таймер.": "10 levels, each with its own timer.",
  "Начнём с уровня": "We'll start with level",
  "Держи ладонь здесь для старта": "Hold your palm here to start",
  "Курсор руки → центр кнопки": "Hand cursor → button centre",
  "Сначала сожми или опусти руку": "Close or lower your hand first",
  "Станция снова в строю.": "The station is back online.",
  "Рекорд на этом устройстве:": "Best on this device:",
  "очков": "points", "уровней": "levels", "лучшая серия": "best combo",
  "подсказок": "corrections", "Новая кампания": "New campaign",
  "Повторить уровень": "Retry level", "Задержи раскрытую ладонь здесь": "Hold an open palm here",
  "Сожми руку, затем раскрой здесь": "Close your hand, then open it here",
  "Левая рука: настройка частоты": "Left hand: tune frequency",
  "Таймер на паузе · покажи обе руки целиком": "Timer paused · show both hands fully",
  // Sectors and tasks
  "Связь": "Communications", "Вернуть сигнал станции": "Restore the station signal",
  "вернуть сигнал станции": "restore the station signal", "связь": "communications",
  "Навигация": "Navigation", "Открыть безопасный маршрут": "Open a safe route",
  "открыть безопасный маршрут": "open a safe route", "навигация": "navigation",
  "Жизнеобеспечение": "Life support", "Защитить экипаж": "Protect the crew",
  "защитить экипаж": "protect the crew", "жизнеобеспечение": "life support",
  "Солнечные панели": "Solar panels", "Развернуть питание станции": "Deploy station power",
  "развернуть питание станции": "deploy station power", "солнечные панели": "solar panels",
  "Защитный контур": "Shield circuit", "Закрыть два повреждённых узла": "Seal two damaged nodes",
  "закрыть два повреждённых узла": "seal two damaged nodes", "защитный контур": "shield circuit",
  "Тепловой баланс": "Thermal balance", "Очистить три канала охлаждения": "Clear three cooling channels",
  "очистить три канала охлаждения": "clear three cooling channels", "тепловой баланс": "thermal balance",
  "Ориентация": "Orientation", "Выровнять станцию по двум осям": "Align the station on two axes",
  "выровнять станцию по двум осям": "align the station on two axes", "ориентация": "orientation",
  "Реактор": "Reactor", "Перезапустить оба контура": "Restart both circuits",
  "перезапустить оба контура": "restart both circuits", "реактор": "reactor",
  "Аварийный маяк": "Emergency beacon", "Пробить помехи и передать координаты": "Cut through interference and send coordinates",
  "пробить помехи и передать координаты": "cut through interference and send coordinates", "аварийный маяк": "emergency beacon",
  "Центральное ядро": "Central core", "Соединить все системы станции": "Connect every station system",
  "соединить все системы станции": "connect every station system", "центральное ядро": "central core",
  "Пробуждение": "Awakening", "Нестабильность": "Instability",
  "Сближение": "Convergence", "Финал": "Finale",
  "Подключи энергоячейку": "Connect the power cell", "Заряди модуль": "Charge the module",
  "Убери помеху": "Clear interference", "Настрой сигнал и почини провод": "Tune the signal and repair the wire",
  "Наведи курсор на ячейку слева, соедини большой и указательный пальцы. Перенеси в порт справа и разожми.":
    "Move the cursor to the cell on the left and pinch thumb to index finger. Carry it to the port on the right, then release.",
  "Раскрой ладонь и удерживай курсор в порту справа, пока кольцо не заполнится.":
    "Open your palm and hold the cursor in the port on the right until the ring fills.",
  "Раскрой ладонь и проведи ею слева направо через отмеченную полосу.":
    "Open your palm and swipe from left to right through the marked lane.",
  "Держи руки по разным сторонам кадра. ЛЕВОЙ подбери частоту. ПРАВОЙ захвати конец провода СПРАВА и тяни его к разъёму В ЦЕНТРЕ. Удержи контакт, затем раскрой обе ладони.":
    "Keep your hands on opposite sides of the frame. Tune the frequency with your LEFT hand. Pinch the wire end on the RIGHT with your RIGHT hand and pull it to the CENTRE socket. Hold the contact, then open both palms.",
  // Camera and gesture feedback
  "Покажи раскрытую ладонь в центре кадра.": "Show an open palm in the centre of the frame.",
  "Камера заблокирована. Разреши доступ в настройках сайта рядом с адресной строкой и попробуй снова.":
    "Camera access is blocked. Allow it in the site settings next to the address bar and try again.",
  "Камера не найдена. Подключи веб-камеру и попробуй снова.": "No camera found. Connect a webcam and try again.",
  "Камера занята другим приложением. Закрой видеозвонок и попробуй снова.":
    "Another app is using the camera. Close it and try again.",
  "Не удалось запустить распознавание. Проверь интернет для загрузки файлов, обнови браузер и попробуй снова.":
    "Could not start tracking. Check your connection for the model download, refresh your browser and try again.",
  "Разреши доступ к камере…": "Allow camera access…", "Загружаем распознавание руки…": "Loading hand tracking…",
  "Распознавание остановилось. Перезапусти камеру.": "Tracking stopped. Restart the camera.",
  "Камера отключена. Подключи её и попробуй снова.": "Camera disconnected. Reconnect it and try again.",
  "Распознавание не отвечает. Перезапусти камеру.": "Tracking is not responding. Restart the camera.",
  "Камера подключена": "Camera connected",
  "Покажи одну руку камере целиком.": "Show one whole hand to the camera.",
  "Поднеси руку ближе к камере.": "Move your hand closer to the camera.",
  "Отодвинь руку: она слишком близко.": "Move your hand farther away; it is too close.",
  "Сдвинь руку к центру: пальцы выходят за кадр.": "Move your hand towards the centre; your fingers are outside the frame.",
  "Ячейка подключена": "Cell connected", "Питание восстановлено": "Power restored",
  "Помеха устранена": "Interference cleared", "Связь восстановлена": "Signal restored",
  "Левой рукой найди частоту. Правой захвати провод СПРАВА и тяни к центру.":
    "Tune the frequency with your left hand. Grab the wire on the RIGHT and pull it towards the centre with your right hand.",
  "Покажи левую руку целиком: ею настраивается частота.":
    "Show your whole left hand; it tunes the frequency.",
  "Сдвинь ладонь к центру кадра.": "Move your palm towards the centre of the frame.",
  "Отлично. Задержи ладонь на секунду.": "Great. Hold your palm there for a second.",
  "Опусти или сожми руку, затем снова раскрой ладонь.": "Lower or close your hand, then open it again.",
  "Наведи раскрытую ладонь на кнопку и удерживай.": "Move an open palm over the button and hold it.",
  "Разожми пальцы — ячейка в порту.": "Release your fingers — the cell is in the port.",
  "Это ложный порт. Нужен зелёный, а не янтарный круг.":
    "That is a false port. Aim for the green ring, not the amber one.",
  "Держи пальцы вместе и перенеси ячейку в зелёный порт.":
    "Keep your fingers pinched and move the cell to the green port.",
  "Это ложный порт. Захвати ячейку снова и донеси до зелёного кольца.":
    "That is a false port. Grab the cell again and carry it to the green ring.",
  "Разжал слишком рано. Донеси ячейку до зелёного кольца справа.":
    "You released too early. Carry the cell all the way to the green ring on the right.",
  "Захват! Перенеси ячейку вправо, не разжимая пальцы.":
    "Grabbed! Move the cell right without releasing your pinch.",
  "Наведи курсор на ячейку слева.": "Move the cursor onto the cell on the left.",
  "Разожми пальцы и снова сделай щипок над ячейкой.": "Release, then pinch again over the cell.",
  "Соедини кончики большого и указательного пальцев.": "Bring your thumb and index fingertips together.",
  "Перемести раскрытую ладонь в кольцо справа.": "Move your open palm into the ring on the right.",
  "Держи ладонь здесь. Модуль заряжается.": "Hold your palm here. The module is charging.",
  "Частота слишком высокая — опусти левую руку.": "Frequency too high — lower your left hand.",
  "Частота слишком низкая — подними левую руку.": "Frequency too low — raise your left hand.",
  "Контакт есть. Раскрой обе ладони, чтобы передать сигнал.":
    "Contact established. Open both palms to transmit the signal.",
  "Сигнал передаётся. Удержи обе ладони открытыми.": "Transmitting. Keep both palms open.",
  "Отпустил провод до фиксации. Захвати конец снова и удержи его в разъёме.":
    "You released the wire before it locked. Grab the end again and hold it in the socket.",
  "Частота совпала. Правой рукой тяни провод справа к разъёму в центре.":
    "Frequency matched. Pull the wire from the right to the centre socket with your right hand.",
  "Контакт найден. Удержи щипок и частоту до фиксации.":
    "Contact found. Hold the pinch and frequency until it locks.",
  "Провод закреплён": "Wire secured",
  "Провод закреплён. Раскрой обе ладони для передачи.":
    "Wire secured. Open both palms to transmit.",
  "Частота совпала. Правой рукой веди провод справа к центру.":
    "Frequency matched. Move the wire from the right to the centre with your right hand.",
  "Частота совпала. Наведи правую руку на свободный конец провода СПРАВА.":
    "Frequency matched. Move your right hand to the loose wire end on the RIGHT.",
  "Разожми правые пальцы и сделай новый щипок над концом провода.":
    "Release your right fingers and pinch again over the wire end.",
  "Сделай щипок правой рукой над свободным концом провода.":
    "Pinch the loose wire end with your right hand.",
  "Раскрой ладонь перед взмахом.": "Open your palm before swiping.",
  "В другую сторону: веди ладонь слева направо по экрану.":
    "Wrong direction: move your palm from left to right on the screen.",
  "Веди ладонь горизонтально, не вверх или вниз.": "Move your palm horizontally, not up or down.",
  "Продолжи движение дальше вправо, одним взмахом.": "Continue farther right in one sweep.",
  // ORBIT LABS: the personal vocabulary remains an explicitly experimental mode.
  "← Вернуться к игре": "← Back to game",
  "ЭКСПЕРИМЕНТАЛЬНЫЙ РЕЖИМ": "EXPERIMENTAL MODE",
  "Покажи жест.": "Show a gesture.", "Получится слово.": "Turn it into a word.",
  "Создай личный словарь движений одной или двух рук. ORBIT запоминает три повтора, затем собирает распознанные слова в сообщение — прямо в браузере.":
    "Build a personal vocabulary of one- or two-hand movements. ORBIT learns three repetitions and assembles recognized words into a message, right in your browser.",
  "Это распознавание персональных жестов,": "This recognizes personal gestures; it is",
  "не полноценный перевод International Sign": "not a full International Sign translator",
  ". Жестовые языки различаются; для настоящего перевода нужны проверенный корпус и участие носителей.":
    ". Sign languages differ. Real translation requires a validated corpus and participation from sign-language users.",
  "01 / КАМЕРА": "01 / CAMERA", "Видим обе руки": "Tracking both hands",
  "● В эфире": "● Live", "○ Не подключена": "○ Disconnected",
  "Видео обрабатывается только на этом устройстве": "Video is processed only on this device",
  "Камера не подключена": "Camera not connected", "Камера отключена": "Camera disconnected",
  "Отключить": "Disconnect", "Подключаем…": "Connecting…",
  "Распознано:": "Recognized:",
  "02 / ОБУЧЕНИЕ": "02 / TRAINING", "Добавь слово": "Add a word",
  "Назови жест и покажи его трижды. Можно использовать обе руки и движение. Запись одного повтора длится 1,5 секунды.":
    "Name a gesture and show it three times. You can use both hands and movement. Each recording lasts 1.5 seconds.",
  "Слово или короткая фраза": "Word or short phrase",
  "Например: мне нужна помощь": "For example: I need help",
  "Идёт запись…": "Recording…", "Записать 3 повтора": "Record 3 repetitions",
  "03 / СЛОВАРЬ": "03 / VOCABULARY", "Твои жесты": "Your gestures",
  "Словарь пуст. Запиши первый жест, чтобы начать перевод.":
    "Your vocabulary is empty. Record your first gesture to begin.",
  "две руки": "two hands", "одна рука": "one hand", "3 записи": "3 recordings",
  "Удалить": "Delete",
  "На этом устройстве сохраняются введённое слово и координаты рук, но не фото или видео. Словарь другого человека может требовать отдельной записи.":
    "This device stores the words you enter and hand coordinates, not photos or video. Another person's gestures may need separate training.",
  "04 / СООБЩЕНИЕ": "04 / MESSAGE", "Текст из жестов": "Text from gestures",
  "слов": "words", "Покажи записанный жест — слово появится здесь.":
    "Show a recorded gesture and its word will appear here.",
  "Убрать последнее": "Remove last", "Очистить": "Clear", "Озвучить": "Speak",
  "ORBIT TRANSLATOR · прототип персонального словаря, а не средство профессионального перевода. Для реального жестового языка необходимы данные и оценка его носителями.":
    "ORBIT TRANSLATOR · a personal-vocabulary prototype, not a professional translation tool. Real sign-language translation requires data and evaluation by sign-language users.",
  "Подключи камеру и покажи жест.": "Connect the camera and show a gesture.",
  "Помести руки целиком в кадр и отодвинься на удобное расстояние.":
    "Keep your whole hands in frame and move back to a comfortable distance.",
  "Покажи руки целиком. Между словами ненадолго убирай руки из кадра.":
    "Show your whole hands. Briefly remove them from frame between words.",
  "Жест добавлен. Убери руки на мгновение, затем покажи следующий.":
    "Gesture added. Remove your hands for a moment, then show the next one.",
  "Покажи один из записанных жестов.": "Show one of your recorded gestures.",
  "Сначала запиши свой первый жест.": "Record your first gesture first.",
  "Такое слово уже есть. Выбери другое или удали старую запись.":
    "That word already exists. Choose another or delete the old recording.",
  "Приготовься: нужны 3 одинаковых повтора.": "Get ready: three matching repetitions are needed.",
  "Во всех трёх повторах используй одинаковое число рук. Начни запись снова.":
    "Use the same number of hands in all three repetitions. Start again.",
  "Не получилось сохранить жест. Повтори запись при ровном свете.":
    "Could not save the gesture. Record it again in even lighting.",
  "Браузер не дал сохранить словарь. Разреши хранение данных сайта и попробуй снова.":
    "The browser could not save the vocabulary. Allow site storage and try again.",
  "Жест не сохранён. Проверь настройки хранения браузера.":
    "Gesture not saved. Check browser storage settings.",
  "Запись прервалась. Попробуй ещё раз.": "Recording was interrupted. Try again.",
  "Не удалось изменить словарь в браузере.": "Could not update the vocabulary in this browser.",
  "Покажи жест целиком в кадре — камера должна видеть пальцы.":
    "Show the whole gesture in frame so the camera can see your fingers.",
  "Для этого жеста покажи обе руки целиком.": "Show both whole hands for this gesture.",
  "Для такого числа рук пока нет записанного жеста. Добавь его в словарь.":
    "No gesture has been trained for that number of hands. Add one to your vocabulary.",
  "Жест похож сразу на два слова. Сделай движение более отчётливо или перезапиши похожие жесты.":
    "This resembles two words. Make the movement clearer or retrain the similar gestures.",
  "Связь прервалась": "Connection lost",
  "Не удалось отобразить приложение. Перезагрузи страницу, чтобы отключить текущую камеру и начать заново.":
    "The app could not be displayed. Reload the page to stop the camera and start again.",
  "Перезагрузить": "Reload",
};
const replacementEntries = Object.entries(english)
  .filter(([ru]) => ru.length >= 3)
  .sort((a, b) => b[0].length - a[0].length);

// Dynamic messages from the deterministic game engine. Its Russian messages remain
// stable for existing tests; only presentation is translated.
const dynamic: Array<[RegExp, (...groups: string[]) => string]> = [
  [/^ВСЕ 10 УРОВНЕЙ ПРОЙДЕНЫ · РАНГ ([SABC])$/, (_, rank) => `ALL 10 LEVELS COMPLETE · RANK ${rank}`],
  [/^ФИНАЛЬНЫЙ УРОВЕНЬ ПРОЙДЕН · РАНГ ([SABC])$/, (_, rank) => `FINAL LEVEL COMPLETE · RANK ${rank}`],
  [/^УРОВЕНЬ (\d+) НЕ ПРОЙДЕН · ПОПРОБУЙ ЕЩЁ РАЗ$/, (_, n) => `LEVEL ${n} FAILED · TRY AGAIN`],
  [/^Уровень (\d+): (.+)\. Захвати ячейку слева\.$/i, (_, n, goal) => `Level ${n}: ${translateText(goal, "en")}. Grab the cell on the left.`],
  [/^Узел (\d+) восстановлен\. Найди следующую ячейку слева\.$/, (_, n) => `Node ${n} repaired. Find the next cell on the left.`],
  [/^(.+) восстановлена\. Дальше — (.+)\.$/, (_, previous, next) => `${translateText(previous, "en")} restored. Next: ${translateText(next, "en")}.`],
  [/^Левая рука видна не полностью\. (.+)$/, (_, hint) => `Left hand is not fully visible. ${translateText(hint, "en")}`],
  [/^Разогни четыре пальца\. Видно раскрытых: (\d+) из 4\.$/, (_, n) => `Straighten all four fingers. Open: ${n} of 4.`],
  [/^Разогни пальцы: раскрыты (\d+) из 4\.$/, (_, n) => `Straighten your fingers: ${n} of 4 open.`],
  [/^Поток расчищен\. Проведи ещё раз через (верхнюю|нижнюю|среднюю) полосу\.$/, (_, lane) => `Lane cleared. Swipe through the ${laneEnglish(lane)} lane again.`],
  [/^Осталось потоков: (\d+)$/, (_, n) => `Lanes remaining: ${n}`],
  [/^Взмахни через (верхнюю|нижнюю|среднюю) отмеченную полосу\.$/, (_, lane) => `Swipe through the marked ${laneEnglish(lane)} lane.`],
  [/^Начни слева и проведи раскрытой ладонью через (верхнюю|нижнюю|среднюю) полосу вправо\.$/, (_, lane) => `Start on the left and swipe your open palm right through the ${laneEnglish(lane)} lane.`],
  [/^Выбран уровень (\d+) · (.+)\. После обучения начнёшь с него\.$/, (_, n, sector) => `Level ${n} selected · ${translateText(sector, "en")}. You'll start there after practice.`],
  [/^Уровень (\d+): (.+?)(, закрыт)?$/, (_, n, sector, locked) => `Level ${n}: ${translateText(sector, "en")}${locked ? ", locked" : ""}`],
  [/^Пройдено (\d+) из (\d+) уровней$/, (_, n, total) => `${n} of ${total} levels complete`],
  [/^Уровень (\d+): (.+)$/, (_, n, sector) => `Level ${n}: ${translateText(sector, "en")}`],
  [/^Уровень (\d+) · (.+)\. После обучения начнёшь с него\.$/, (_, n, sector) => `Level ${n} · ${translateText(sector, "en")}. You'll start there after practice.`],
  [/^(.+) · (.+) · узел (\d+)\/(\d+)$/, (_, act, goal, n, total) => `${translateText(act, "en")} · ${translateText(goal, "en")} · node ${n}/${total}`],
  [/^(.+) работает\.$/, (_, sector) => `${translateText(sector, "en")} is online.`],
  [/^Следующая цель — (.+)\.$/, (_, goal) => `Next objective: ${translateText(goal, "en")}.`],
  [/^Повтори «(.+)»\.$/, (_, sector) => `Retry “${translateText(sector, "en")}”.`],
  [/^Рекорд на этом устройстве: (\d+)$/, (_, score) => `Best on this device: ${score}`],
  [/^Осталось очистить (\d+) потока\.$/, (_, n) => `${n} lanes left to clear.`],
  [/^(\d+) из 2 рук в кадре$/, (_, n) => `${n} of 2 hands in frame`],
  [/^Повтор (\d+)\/3 · начни через (\d+)…$/, (_, n, seconds) => `Repetition ${n}/3 · start in ${seconds}…`],
  [/^Повтор (\d+)\/3 · покажи жест сейчас$/, (_, n) => `Repetition ${n}/3 · show the gesture now`],
  [/^Повтор (\d+) не записан: держи (обе руки|руку) целиком в кадре и повтори запись\.$/, (_, n, hands) => `Repetition ${n} was not recorded: keep your ${hands === "руку" ? "hand" : "hands"} fully in frame and try again.`],
  [/^Повтор (\d+)\/3 готов\. Убери руки перед следующим\.$/, (_, n) => `Repetition ${n}/3 complete. Remove your hands before the next one.`],
  [/^Похоже на «(.+)»\. Удержи жест для подтверждения\.$/, (_, word) => `Looks like “${word}”. Hold the gesture to confirm.`],
  [/^Добавлено: «(.+)»\. Убери руки, чтобы продолжить\.$/, (_, word) => `Added: “${word}”. Remove your hands to continue.`],
  [/^«(.+)» добавлено\. Убери руки и покажи жест снова для проверки\.$/, (_, word) => `“${word}” added. Remove your hands, then show the gesture again to check it.`],
  [/^Для «(.+)» проведи рукой (правее|левее)\.$/, (_, word, direction) => `For “${word}”, move your hand farther ${direction === "правее" ? "right" : "left"}.`],
  [/^Для «(.+)» двигай рукой (ниже|выше)\.$/, (_, word, direction) => `For “${word}”, move your hand ${direction === "ниже" ? "lower" : "higher"}.`],
  [/^Жест пока не совпадает с «(.+)»\. Повтори форму пальцев и путь рук, как при записи\.$/, (_, word) => `This doesn't match “${word}” yet. Repeat the finger shape and hand path you recorded.`],
  [/^Удалить жест (.+)$/, (_, word) => `Delete gesture ${word}`],
  [/^Удалить жест «(.+)» с этого устройства\?$/, (_, word) => `Delete “${word}” from this device?`],
  [/^(.+) из 2 рук в кадре$/, (_, n) => `${n} of 2 hands in frame`],
];

function laneEnglish(lane: string) {
  return lane === "верхнюю" ? "upper" : lane === "нижнюю" ? "lower" : "middle";
}

export function translateText(value: string, locale: Locale): string {
  if (locale === "ru" || !/[А-Яа-яЁё]/.test(value)) return value;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.trim().replace(/\s+/g, " ").replace(/\s*&nbsp;\s*/g, " ");
  const exact = english[core];
  if (exact) return leading + exact + trailing;
  for (const [pattern, render] of dynamic) {
    const match = core.match(pattern);
    if (match) return leading + render(...match) + trailing;
  }
  // Short fragments composed by JSX interpolation, e.g. "УРОВЕНЬ 02 / 10".
  let translated = core;
  for (const [ru, en] of replacementEntries) {
    if (translated.includes(ru)) translated = translated.replaceAll(ru, en);
  }
  translated = translated.replaceAll("УРОВЕНЬ", "LEVEL").replaceAll("узел", "node");
  return leading + translated + trailing;
}

export function localizeTree(node: ReactNode, locale: Locale): ReactNode {
  if (locale === "ru") return node;
  if (typeof node === "string") return translateText(node, locale);
  if (Array.isArray(node)) return node.map((child) => localizeTree(child, locale));
  if (!isValidElement(node)) return node;
  const props = node.props as Record<string, unknown>;
  if (props["data-no-translate"]) return node;
  const updates: Record<string, unknown> = {};
  for (const key of ["aria-label", "title", "placeholder", "alt"]) {
    if (typeof props[key] === "string") updates[key] = translateText(props[key], locale);
  }
  if ("children" in props) updates.children = Children.map(props.children as ReactNode, (child) => localizeTree(child, locale));
  return cloneElement(node, updates);
}
