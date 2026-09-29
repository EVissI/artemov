/** AA - Два мира. Глобальный неймспейс: window.AA (React 18). */

export type Theme = 'fog' | 'other';
export type Format = '16:9' | '9:16';

/** Работа на стене постеров. */
export interface Work { id: string; title: string; category: string; format: Format; year: number; previewImage?: string; previewVideo?: string; videoUrl?: string; description?: string; order?: number; published?: boolean; }
export interface CaseItem { id: string; client: string; task: string; done: string; metrics?: { label: string; before: string; after: string }[]; link?: string; year?: number; }
export interface NavItem { id: string; label: string; }
export interface Stat { id: string; value: number | null; display?: string; suffix?: string; label: string; placeholder?: boolean; }
export interface HeroContent { kicker: string; titleLines: string[]; subtitle: string; primaryCta?: { label: string; target: string }; secondaryCta?: { label: string; target: string }; media?: { type: 'wall' | 'image' | 'video'; src?: string; poster?: string; alt?: string }; wall?: { frames?: { image?: string; caption?: string }[]; notes?: string[] }; meta?: string[]; }
/** Схема content/content.json (schema 1). */
export interface Content {
  site: { name: string; monogram: string; year: number; title: string; description: string };
  nav: NavItem[];
  hero: HeroContent;
  about: { kicker: string; title: string; noteTitle: string; paragraphs: string[]; signature: string; stats: Stat[]; statsCaption?: string[] };
  services: { kicker: string; title: string; intro?: string; items: { id: string; title: string; text: string; timecode?: string }[] };
  rift: { title: string[]; topMeta?: string[]; bottomMeta?: string[] };
  works: { kicker: string; title: string; intro?: string; allLabel?: string; categories: { id: string; label: string }[]; items: Work[] };
  cases: { kicker: string; title: string; items: CaseItem[] };
  contact: { kicker: string; title: string; lead: string; frequency?: string; fields: Record<'name' | 'contact' | 'message', { label: string; placeholder?: string }>; submitLabel: string; sendingLabel: string; successTitle: string; successText: string; successAgain: string; errorText: string; telegram?: string; channelsTitle?: string; channels: { id: string; label: string; value: string; url?: string }[]; asideNote?: string };
  footer: { copyright: string; lines?: string[]; toTop?: string };
}
export interface LeadValues { name: string; contact: string; message: string; }

/** Весь лендинг из одного объекта контента. */
/** Режим правки (админка). Провайдер со своим объектом превращает Landing в редактор: тексты правятся на месте,
 *  слоты медиа подсвечены. Без провайдера компоненты ведут себя как на сайте. */
export interface EditApi {
  text(p: { p: string; v?: string; ph?: string }): JSX.Element;
  slot(p: { p: string; v?: string; accept: 'image' | 'video'; label: string; compact?: boolean; link?: boolean }): JSX.Element;
  tools(p: { list: string; id?: string; index?: number; kind: string; axis?: 'x' | 'y' }): JSX.Element | null;
  add(p: { list: string; kind: string; label: string; tag?: string; extra?: Record<string, unknown> }): JSX.Element;
  section(p: { p: string; kind: string; label: string }): JSX.Element;
}
export declare const EditContext: React.Context<EditApi | null>;
/** Редактируемый текст по пути в контенте ("hero.subtitle", "works.items.@w-01.title"). Без EditContext - просто строка. */
export declare function E(props: { p: string; v?: string; ph?: string }): JSX.Element | string | null;
export declare function Landing(props: { content: Content; contained?: boolean; onSubmitLead?: (v: LeadValues) => Promise<unknown>; atmosphere?: boolean }): JSX.Element;
/** Монограмма «AA» блэклеттером. */
export declare function Monogram(props: { variant?: 'mark' | 'seal' | 'watermark'; text?: string; label?: string; className?: string; style?: object }): JSX.Element;
/** Кнопка: siren - главное действие, outline - остальное. */
export declare function Button(props: { variant?: 'siren' | 'outline'; href?: string; arrow?: string; children?: any; type?: 'button' | 'submit'; disabled?: boolean; onClick?: (e: any) => void }): JSX.Element;
/** Мигающий индикатор «● REC». */
export declare function Rec(props: { label?: string; className?: string }): JSX.Element;
/** Чип фильтра. */
export declare function Chip(props: { active?: boolean; count?: number; children?: any; onClick?: () => void }): JSX.Element;
/** Декоративный штрихкод из seed. */
export declare function Barcode(props: { seed?: string; bars?: number; className?: string }): JSX.Element;
/** Зерно, сканлайны, виньетка. */
export declare function Atmosphere(props: { fixed?: boolean; grain?: boolean; scanlines?: boolean; vignette?: boolean }): JSX.Element;
/** Фиксированный хедер. */
export declare function Header(props: { nav: NavItem[]; theme?: Theme; active?: string | null; onNavigate?: (id: string) => void; monogram?: string; recLabel?: string; fixed?: boolean }): JSX.Element;
/** Стена следователя: сцена hero. */
export declare function EvidenceWall(props: { wall?: HeroContent['wall']; works?: Work[]; monogram?: string }): JSX.Element;
/** Первый экран с фонариком. */
export declare function Hero(props: { hero: HeroContent; works?: Work[]; monogram?: string; onNavigate?: (id: string) => void; id?: string }): JSX.Element;
/** Контейнер с эффектом фонарика вокруг курсора. */
export declare function Flashlight(props: { className?: string; radius?: string; children?: any; [k: string]: any }): JSX.Element;
/** Счётчик с анимацией набора. */
export declare function Counter(props: { value: number | null; display?: string; suffix?: string; label: string; duration?: number }): JSX.Element;
/** Список услуг как трек-лист. */
export declare function Tracklist(props: { items: { id?: string; title: string; text: string; timecode?: string }[] }): JSX.Element;
/** Переход между мирами, привязанный к прокрутке (или progress 0…1). */
export declare function WorldRift(props: { rift: Content['rift']; progress?: number; strips?: number; id?: string }): JSX.Element;
/** Мини-постер работы. */
export declare function PosterCard(props: { work: Work; index?: number; categoryLabel?: string; onOpen?: (w: Work) => void }): JSX.Element;
/** Модалка-плеер. */
export declare function VideoModal(props: { work: Work; categoryLabel?: string; onClose: () => void }): JSX.Element;
/** Кейс-бирка. */
export declare function CaseTag(props: { item: CaseItem; index?: number }): JSX.Element;
/** Форма-передатчик. */
export declare function Transmitter(props: { contact: Content['contact']; onSubmit?: (v: LeadValues) => Promise<unknown>; initialState?: 'idle' | 'success' }): JSX.Element;
/** Футер. */
export declare function Footer(props: { footer: Content['footer']; monogram?: string; onNavigate?: (id: string) => void }): JSX.Element;
/** Секции-обёртки, из которых собран Landing. */
export declare function About(props: { about: Content['about'] }): JSX.Element;
export declare function Services(props: { services: Content['services'] }): JSX.Element;
export declare function Works(props: { works: Content['works'] }): JSX.Element;
export declare function Cases(props: { cases: Content['cases'] }): JSX.Element;
export declare function Contact(props: { contact: Content['contact']; onSubmit?: (v: LeadValues) => Promise<unknown> }): JSX.Element;

export declare function toRoman(n: number): string;
export declare function youtubeId(url: string): string | null;
export declare function validateLead(v: LeadValues): Partial<Record<keyof LeadValues, string>>;
export declare const api: {
  loadContent(opts?: { endpoint?: string; fallback?: Content }): Promise<Content | null>;
  submitLead(payload: LeadValues, opts?: { endpoint?: string }): Promise<unknown>;
};
