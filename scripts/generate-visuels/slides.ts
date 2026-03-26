// Slide templates for Session 2 — each function returns full HTML
import { baseCSS, colors } from './style.js'

export interface SlideDefinition {
  id: string
  title: string
  html: string
  width: number
  height: number
}

const wrap = (content: string, cssClass = 'slide') =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCSS}</style></head>
   <body><div class="${cssClass}">${content}</div></body></html>`

const wrapSquare = (content: string) => wrap(content, 'slide-square')

// ─── SLIDE 1: House analogy ─────────────────────────────────

export const slide01_foundation = (): SlideDefinition => ({
  id: 'slide-01-fondation',
  title: 'Фундамент',
  width: 1920,
  height: 1080,
  html: wrap(`
    <h1>Почему фундамент важнее этажей</h1>
    <div class="row">

      <div class="col" style="align-items:center; flex:1;">
        <div style="background:${colors.danger}11; border:2px solid ${colors.danger}33; border-radius:20px; padding:40px; text-align:center; width:100%;">
          <div style="font-size:120px; line-height:1;">🏚️</div>
          <div style="font-size:160px; margin:16px 0; filter:saturate(0.5);">🏗️</div>
          <h2 style="color:${colors.danger};">❌ Без плана</h2>
          <ul style="list-style:none; text-align:left; margin-top:20px;">
            <li style="font-size:24px; margin:12px 0;">💧 Водопровод не рассчитан</li>
            <li style="font-size:24px; margin:12px 0;">⚠️ Нет устойчивости</li>
            <li style="font-size:24px; margin:12px 0;">🔗 Каскадные поломки</li>
          </ul>
          <p style="margin-top:20px; color:${colors.textMuted}; font-size:20px;">Надстраивал этажи без плана</p>
        </div>
      </div>

      <div style="font-size:64px; color:${colors.textMuted}; align-self:center;">VS</div>

      <div class="col" style="align-items:center; flex:1;">
        <div style="background:${colors.success}11; border:2px solid ${colors.success}33; border-radius:20px; padding:40px; text-align:center; width:100%;">
          <div style="font-size:120px; line-height:1;">🏢</div>
          <div style="font-size:160px; margin:16px 0;">🏗️</div>
          <h2 style="color:${colors.success};">✅ С фундаментом</h2>
          <ul style="list-style:none; text-align:left; margin-top:20px;">
            <li style="font-size:24px; margin:12px 0;">✓ Водопровод продуман</li>
            <li style="font-size:24px; margin:12px 0;">✓ Фундамент рассчитан</li>
            <li style="font-size:24px; margin:12px 0;">✓ Каждый этаж спланирован</li>
          </ul>
          <p style="margin-top:20px; color:${colors.textMuted}; font-size:20px;">Сначала фундамент, потом этажи</p>
        </div>
      </div>

    </div>
    <div class="quote">"Не нужно уметь прокладывать трубы. Нужно знать, что они необходимы."</div>
  `),
})

// ─── SLIDE 2: Security context ──────────────────────────────

export const slide02_security = (): SlideDefinition => ({
  id: 'slide-02-securite',
  title: 'Безопасность',
  width: 1920,
  height: 1080,
  html: wrap(`
    <h1>Безопасность зависит от контекста</h1>
    <div class="row">

      <div class="col" style="align-items:center; flex:1;">
        <div style="background:${colors.danger}11; border:2px solid ${colors.danger}33; border-radius:20px; padding:48px; text-align:center; width:100%;">
          <div style="font-size:100px;">🏚️🌃</div>
          <h2 style="margin-top:20px;">Опасный район</h2>
          <div style="font-size:48px; margin:20px 0;">🔒 🛡️ 📹</div>
          <p style="font-size:24px; color:${colors.text};">Решётки, бронированные двери,<br>сигнализация, камеры</p>
          <div style="margin-top:24px; padding:12px 24px; background:${colors.danger}22; border-radius:12px;">
            <p style="font-size:22px; font-weight:600; color:${colors.danger};">Банковское приложение</p>
            <p style="font-size:22px; font-weight:600; color:${colors.danger};">Медицинские данные</p>
            <p style="font-size:22px; font-weight:600; color:${colors.danger};">Финансовые операции</p>
          </div>
          <p style="margin-top:20px; font-size:28px; font-weight:700; color:${colors.danger};">→ Максимальная защита</p>
        </div>
      </div>

      <div style="font-size:64px; color:${colors.textMuted}; align-self:center;">VS</div>

      <div class="col" style="align-items:center; flex:1;">
        <div style="background:${colors.success}11; border:2px solid ${colors.success}33; border-radius:20px; padding:48px; text-align:center; width:100%;">
          <div style="font-size:100px;">🏡☀️</div>
          <h2 style="margin-top:20px;">Спокойный район</h2>
          <div style="font-size:48px; margin:20px 0;">🪟 🌿 🌤️</div>
          <p style="font-size:24px; color:${colors.text};">Панорамные окна,<br>открытая терраса, комфорт</p>
          <div style="margin-top:24px; padding:12px 24px; background:${colors.success}22; border-radius:12px;">
            <p style="font-size:22px; font-weight:600; color:${colors.success};">Личный блог</p>
            <p style="font-size:22px; font-weight:600; color:${colors.success};">Сайт-визитка</p>
            <p style="font-size:22px; font-weight:600; color:${colors.success};">Портфолио</p>
          </div>
          <p style="margin-top:20px; font-size:28px; font-weight:700; color:${colors.success};">→ Свобода и открытость</p>
        </div>
      </div>

    </div>
    <div class="quote">"Нужно знать, в каком районе вы строите."</div>
  `),
})

// ─── SLIDE 3: Restaurant main schema (CRITICAL) ────────────

export const slide03_restaurant = (): SlideDefinition => ({
  id: 'slide-03-restaurant',
  title: 'Ресторан',
  width: 1920,
  height: 1080,
  html: wrap(`
    <h1>Цифровой мир = Ресторан</h1>
    <div class="row" style="flex:1; gap:24px;">

      <!-- ZAL -->
      <div class="card tag-client" style="flex:1; justify-content:center; min-height:500px;">
        <div class="icon-lg">👤</div>
        <h2 style="color:${colors.client}; font-size:40px;">ЗАЛ</h2>
        <span class="badge tag-client">Клиент (Client)</span>
        <p style="font-size:22px; margin-top:16px; color:${colors.text};">Красиво, удобно —<br>для посетителя</p>
        <div style="margin-top:16px; font-size:18px; color:${colors.textMuted};">
          Сайт · Приложение · Бот
        </div>
      </div>

      <div class="arrow">⟹</div>

      <!-- OFFICIAL -->
      <div class="card tag-api" style="flex:1; justify-content:center; min-height:500px;">
        <div class="icon-lg">🤵</div>
        <h2 style="color:${colors.api}; font-size:40px;">ОФИЦИАНТ</h2>
        <span class="badge tag-api">API</span>
        <p style="font-size:22px; margin-top:16px; color:${colors.text};">Правила общения:<br>что можно заказать</p>
        <div style="margin-top:16px; font-size:18px; color:${colors.textMuted};">
          Передаёт · Фильтрует · Защищает
        </div>
      </div>

      <div class="arrow">⟹</div>

      <!-- KITCHEN -->
      <div style="flex:1.3; display:flex; flex-direction:column; gap:16px; min-height:500px;">
        <div class="card tag-server" style="flex:1; justify-content:center;">
          <div class="icon-lg">👨‍🍳</div>
          <h2 style="color:${colors.server}; font-size:40px;">КУХНЯ</h2>
          <span class="badge tag-server">Сервер (Server)</span>
          <p style="font-size:22px; margin-top:16px; color:${colors.text};">Готовит, обрабатывает,<br>принимает решения</p>
        </div>
        <div class="card tag-db" style="flex:0.7; justify-content:center;">
          <div style="display:flex; align-items:center; gap:16px;">
            <span style="font-size:48px;">🧊</span>
            <div>
              <h3 style="color:${colors.database}; font-size:28px; margin:0;">ХОЛОДИЛЬНИК</h3>
              <span class="badge tag-db" style="margin-top:4px;">База данных (Database)</span>
            </div>
          </div>
          <p style="font-size:20px; color:${colors.text}; margin-top:8px;">Хранит все ингредиенты (данные)</p>
        </div>
      </div>

    </div>
    <div class="blocked">❌ Клиент НЕ может попасть в холодильник напрямую — только через официанта и повара</div>
  `),
})

// ─── SLIDE 4: Client types ──────────────────────────────────

export const slide04_clients = (): SlideDefinition => ({
  id: 'slide-04-types-clients',
  title: 'Типы клиентов',
  width: 1920,
  height: 1080,
  html: wrap(`
    <h1>5 лиц одного клиента</h1>
    <div class="row" style="flex:1; gap:20px;">
      ${[
        { icon: '🌐', name: 'Фронтенд', sub: 'Веб', desc: 'Код в вашем браузере', ex: 'Chrome, Safari' },
        { icon: '📱', name: 'Приложение', sub: 'Мобильное', desc: 'Код на вашем телефоне', ex: 'App Store, Play Store' },
        { icon: '💻', name: 'Программа', sub: 'Настольная', desc: 'Код на компьютере', ex: 'Photoshop, VS Code' },
        { icon: '🤖', name: 'Бот', sub: 'Telegram / Discord', desc: 'Платформа = клиент', ex: 'Не нужен свой код' },
        { icon: '🏧', name: 'Терминал', sub: 'Автомат', desc: 'Физическое устройство', ex: 'Банкомат, касса' },
      ].map(c => `
        <div class="card tag-client" style="flex:1; justify-content:center; padding:28px;">
          <div style="font-size:72px;">${c.icon}</div>
          <h3 style="color:${colors.client}; margin:0; font-size:28px;">${c.name}</h3>
          <span style="font-size:18px; color:${colors.textMuted};">${c.sub}</span>
          <p style="font-size:20px; margin-top:12px; color:${colors.text};">${c.desc}</p>
          <span style="font-size:16px; color:${colors.textMuted}; margin-top:8px;">${c.ex}</span>
        </div>
      `).join('')}
    </div>
    <div class="quote">"Разные формы — одна суть: то, с чем взаимодействует пользователь. И за каждым стоит кухня."</div>
  `),
})

// ─── SLIDE 5: Kitchen interior ──────────────────────────────

export const slide05_kitchen = (): SlideDefinition => ({
  id: 'slide-05-cuisine',
  title: 'Внутри кухни',
  width: 1920,
  height: 1080,
  html: wrap(`
    <h1>Внутри кухни</h1>
    <div class="row" style="flex:1;">

      <!-- POVAR -->
      <div class="card tag-server" style="flex:1; justify-content:center; padding:48px;">
        <div style="font-size:100px;">👨‍🍳</div>
        <h2 style="color:${colors.server}; font-size:36px;">ПОВАР</h2>
        <span class="badge tag-server">Программа / Сервер</span>
        <div style="text-align:left; margin-top:32px; font-size:26px;">
          <p style="margin:16px 0;">🔄 Обрабатывает запросы</p>
          <p style="margin:16px 0;">✂️ Комбинирует данные</p>
          <p style="margin:16px 0;">🍽️ Готовит результат</p>
        </div>
      </div>

      <!-- ARROWS -->
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;">
        <div style="font-size:40px;">берёт →</div>
        <div style="font-size:48px;">⇄</div>
        <div style="font-size:40px;">← кладёт</div>
      </div>

      <!-- FRIDGE -->
      <div class="card tag-db" style="flex:1; justify-content:center; padding:48px;">
        <div style="font-size:100px;">🧊</div>
        <h2 style="color:${colors.database}; font-size:36px;">ХОЛОДИЛЬНИК</h2>
        <span class="badge tag-db">База данных</span>
        <div style="text-align:left; margin-top:32px; font-size:26px;">
          <p style="margin:16px 0;">📋 Имена</p>
          <p style="margin:16px 0;">📧 E-mail'ы</p>
          <p style="margin:16px 0;">📸 Фотографии</p>
          <p style="margin:16px 0;">❤️ Лайки</p>
          <p style="margin:16px 0;">💬 Сообщения</p>
        </div>
      </div>

    </div>
    <div class="blocked" style="font-size:24px;">❌ Клиент НЕ может открыть холодильник сам — только повар имеет доступ</div>
  `),
})

// ─── SLIDE 6: Request flow (CRITICAL) ───────────────────────

export const slide06_flow = (): SlideDefinition => ({
  id: 'slide-06-flux',
  title: 'Путь запроса',
  width: 1920,
  height: 1080,
  html: wrap(`
    <h1>Полный путь запроса</h1>

    <!-- FORWARD -->
    <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-top:20px;">
      ${[
        { step: '①', icon: '👤', name: 'КЛИЕНТ', desc: 'Нажимает кнопку', cls: 'tag-client', color: colors.client },
        { step: '②', icon: '🤵', name: 'API', desc: 'Передаёт запрос', cls: 'tag-api', color: colors.api },
        { step: '③', icon: '👨‍🍳', name: 'СЕРВЕР', desc: 'Обрабатывает', cls: 'tag-server', color: colors.server },
        { step: '④', icon: '🧊', name: 'БД', desc: 'Отдаёт данные', cls: 'tag-db', color: colors.database },
      ].map((s, i) => `
        ${i > 0 ? '<div style="font-size:36px; color:#4a5568;">→</div>' : ''}
        <div class="card ${s.cls}" style="padding:24px 32px; min-width:200px;">
          <div style="font-size:20px; color:${s.color}; font-weight:700;">${s.step}</div>
          <div style="font-size:56px;">${s.icon}</div>
          <h3 style="color:${s.color}; margin:4px 0; font-size:24px;">${s.name}</h3>
          <p style="font-size:18px; color:${colors.text};">${s.desc}</p>
        </div>
      `).join('')}
    </div>

    <!-- RETURN -->
    <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-top:12px;">
      ${[
        { step: '⑦', icon: '👤', name: 'КЛИЕНТ', desc: 'Показывает результат', cls: 'tag-client', color: colors.client },
        { step: '⑥', icon: '🤵', name: 'API', desc: 'Передаёт ответ', cls: 'tag-api', color: colors.api },
        { step: '⑤', icon: '👨‍🍳', name: 'СЕРВЕР', desc: 'Готовит результат', cls: 'tag-server', color: colors.server },
      ].map((s, i) => `
        ${i > 0 ? '<div style="font-size:36px; color:#4a5568;">←</div>' : ''}
        <div class="card ${s.cls}" style="padding:24px 32px; min-width:200px; opacity:0.85; border-style:dashed;">
          <div style="font-size:20px; color:${s.color}; font-weight:700;">${s.step}</div>
          <div style="font-size:56px;">${s.icon}</div>
          <h3 style="color:${s.color}; margin:4px 0; font-size:24px;">${s.name}</h3>
          <p style="font-size:18px; color:${colors.text};">${s.desc}</p>
        </div>
      `).join('')}
    </div>

    <!-- EXAMPLE -->
    <div style="background:${colors.bgLight}; border-radius:16px; padding:28px 40px; margin-top:24px; border:1px solid #2a2a4a;">
      <h3 style="color:${colors.api}; margin-bottom:12px;">Пример: лайк в Instagram</h3>
      <div style="display:flex; gap:32px; font-size:20px;">
        <p>❤️ Нажали лайк</p>
        <p style="color:${colors.textMuted};">→</p>
        <p>API передаёт</p>
        <p style="color:${colors.textMuted};">→</p>
        <p>Сервер проверяет</p>
        <p style="color:${colors.textMuted};">→</p>
        <p>БД сохраняет</p>
        <p style="color:${colors.textMuted};">→</p>
        <p>❤️ стало красным</p>
      </div>
    </div>
  `),
})

// ─── SLIDE 7: API rules ─────────────────────────────────────

export const slide07_api = (): SlideDefinition => ({
  id: 'slide-07-api',
  title: 'API',
  width: 1920,
  height: 1080,
  html: wrap(`
    <h1>API — Правила общения</h1>
    <div class="row" style="flex:1;">

      <!-- MOZNO -->
      <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
        <h2 style="color:${colors.success}; font-size:32px;">✅ МОЖНО</h2>
        ${['Сделать заказ', 'Спросить о меню', 'Попросить счёт', 'Узнать время работы'].map(t => `
          <div style="background:${colors.success}11; border:1px solid ${colors.success}33; border-radius:12px; padding:20px 28px; font-size:26px;">
            ✅ ${t}
          </div>
        `).join('')}
      </div>

      <!-- OFICIAL -->
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;">
        <div style="font-size:120px;">🤵</div>
        <h2 style="color:${colors.api}; font-size:32px;">ОФИЦИАНТ</h2>
        <span class="badge tag-api" style="font-size:20px;">API</span>
      </div>

      <!-- NELZYA -->
      <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
        <h2 style="color:${colors.danger}; font-size:32px;">❌ НЕЛЬЗЯ</h2>
        ${['Зайти на кухню', 'Открыть холодильник', 'Приказать повару', 'Попросить потанцевать'].map(t => `
          <div style="background:${colors.danger}11; border:1px solid ${colors.danger}33; border-radius:12px; padding:20px 28px; font-size:26px;">
            ❌ ${t}
          </div>
        `).join('')}
      </div>

    </div>

    <div style="background:${colors.bgLight}; border-radius:16px; padding:24px 40px; margin-top:16px; border:1px solid #2a2a4a;">
      <h3 style="color:${colors.danger}; margin-bottom:8px;">Пример: кто-то пытается читать чужие сообщения</h3>
      <p style="font-size:22px;">
        API <span style="color:${colors.api};">→ передаёт запрос →</span>
        Сервер <span style="color:${colors.danger}; font-weight:700;">→ "Нет прав!" →</span>
        API <span style="color:${colors.danger};">→ "Отказано"</span>
      </p>
    </div>
  `),
})

// ─── SLIDE 8: Cheatsheet (CRITICAL, square) ─────────────────

export const slide08_cheatsheet = (): SlideDefinition => ({
  id: 'slide-08-cheatsheet',
  title: 'Шпаргалка',
  width: 1080,
  height: 1080,
  html: wrapSquare(`
    <h2 style="text-align:center; font-size:36px; margin-bottom:8px;">СЕССИЯ 2 — ШПАРГАЛКА</h2>
    <p style="text-align:center; font-size:22px; color:${colors.textMuted}; margin-bottom:28px;">Цифровой мир = Ресторан</p>

    <!-- FLOW -->
    <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:32px;">
      ${[
        { icon: '👤', color: colors.client },
        { icon: '🤵', color: colors.api },
        { icon: '👨‍🍳', color: colors.server },
        { icon: '🧊', color: colors.database },
      ].map((s, i) => `
        ${i > 0 ? `<div style="font-size:28px; color:${colors.textMuted};">⟹</div>` : ''}
        <div style="font-size:56px; background:${s.color}15; border:2px solid ${s.color}44; border-radius:16px; padding:12px 20px;">${s.icon}</div>
      `).join('')}
    </div>

    <!-- 4 DEFINITIONS -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; flex:1;">
      ${[
        { icon: '👤', title: 'КЛИЕНТ = Зал', desc: 'То, что видит пользователь', cls: 'tag-client', color: colors.client },
        { icon: '🤵', title: 'API = Официант', desc: 'Правила: что можно, что нельзя', cls: 'tag-api', color: colors.api },
        { icon: '👨‍🍳', title: 'СЕРВЕР = Повар', desc: 'Обрабатывает, решает, готовит', cls: 'tag-server', color: colors.server },
        { icon: '🧊', title: 'БД = Холодильник', desc: 'Хранит данные (доступ у повара)', cls: 'tag-db', color: colors.database },
      ].map(d => `
        <div class="card ${d.cls}" style="padding:24px; justify-content:center;">
          <div style="font-size:48px;">${d.icon}</div>
          <h3 style="color:${d.color}; margin:8px 0 4px; font-size:24px;">${d.title}</h3>
          <p style="font-size:18px; color:${colors.text};">${d.desc}</p>
        </div>
      `).join('')}
    </div>

    <div class="blocked" style="margin-top:20px; font-size:20px;">
      ❌ Клиент НИКОГДА не получает доступ к холодильнику напрямую
    </div>

    <p style="text-align:center; font-size:14px; color:${colors.textMuted}; margin-top:12px;">Pilote Neuro — Формация Сессия 2</p>
  `),
})

// ─── EXPORT ALL ─────────────────────────────────────────────

export const allSlides = (): SlideDefinition[] => [
  slide01_foundation(),
  slide02_security(),
  slide03_restaurant(),
  slide04_clients(),
  slide05_kitchen(),
  slide06_flow(),
  slide07_api(),
  slide08_cheatsheet(),
]
