"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "es";

export const DICT = {
  en: {
    nav: { home: "Home", research: "Research", study: "Study", howItWorks: "How it works", openApp: "Use Neuvra" },
    landing: {
      eyebrow: "Research flows + memory tools",
      headline: "Neuvra connects understanding and remembering.",
      sub: "The landing page shows the complete flow. The independent pages let you go directly into the mode you need.",
      ctaPrimary: "Start studying ->",
      ctaSecondary: "Go to Research",
      proofResearch: "Research first",
      proofRetention: "Retention built in",
      proofTool: "Feels like a tool",
      proofResearchDesc: "Upload material, summarise key ideas, and generate structured academic outputs from one flow.",
      proofRetentionDesc: "Convert any output into flashcards, simpler explanations and decks you can actually review.",
      proofToolDesc: "Guided workflows, clean panels and focused study actions, not generic AI chat.",
      featuresTitle: "Research and retention, finally in one product.",
      featuresSub: "Most students juggle one tool to understand and another to memorise. Neuvra connects both sides so you go from question to ready-to-review deck without switching tabs.",
      researchLabel: "Academic flows",
      researchHeading: "Research",
      researchEngine: "Research engine",
      studyLabel: "Retention flows",
      studyHeading: "Study",
      studyEngine: "Study engine",
      goResearch: "Go to Research ->",
      goStudy: "Go to Study ->",
      workflowTitle: "One flow, from question to review.",
      workflowSub: "Instead of reading a paper in one app and building flashcards in another, Neuvra keeps your research and review in the same place.",
      step1title: "1. Ask or upload material",
      step1: "Start with a paper, your class notes, a chapter or a full lecture PDF.",
      step2title: "2. Understand the material",
      step2: "Generate summaries, literature reviews or simple explanations before memorising anything.",
      step3title: "3. Extract what matters",
      step3: "Identify key concepts, definitions, weak areas and likely exam targets from the same material you read.",
      step4title: "4. Turn it into review",
      step4: "Build flashcards and decks from the exact same source without copy-pasting between tools.",
      pricingTitle: "Why pay for two tools when one does both?",
      pricingSub: "The research assistant you already use costs more than Neuvra and does not help you remember anything.",
      waitlistEyebrow: "Early access",
      waitlistTitle: "Understand first. Remember after.\nBoth in one place.",
      waitlistSub: "Neuvra is not just another flashcard app or another AI research assistant. It is the layer that connects understanding, synthesis and memory, built for students and researchers.",
      waitlistPlaceholder: "your@email.com",
      waitlistBtn: "Join the list ->",
      waitlistJoining: "Joining...",
      waitlistCount: "Already {n} students and researchers waiting for early access.",
      waitlistDone: "Done. You are on the list and we will let you know when early access opens.",
      footerTagline: "Research and retention in a connected flow. Built for students and researchers who want to understand first and remember after.",
      footerProduct: "Product",
      footerCompany: "Company",
      footerLegal: "Privacy & Terms",
      footerAbout: "About",
      footerBlog: "Blog",
      footerContact: "Contact",
      footerPrivacy: "Privacy policy",
      footerTerms: "Terms of use",
      footerRights: "All rights reserved.",
    },
    researchFeatures: [
      { title: "Summarise papers instantly", description: "Paste text or a DOI and get methods, findings, limitations and conclusions in plain language in seconds." },
      { title: "Generate literature reviews", description: "Turn a research question into a structured overview of themes, key agreements and evidence gaps." },
      { title: "Find papers from a prompt", description: "Ask in natural language and get relevant papers, research directions and solid starting points." },
      { title: "Organise academic writing", description: "Get help structuring manuscripts, discussion sections, abstracts and the argumentative thread." },
    ],
    studyFeatures: [
      { title: "Generate flashcards with AI", description: "Transform papers, lectures, PDFs and notes into question-and-answer cards ready to review in one step." },
      { title: "Explain this topic", description: "Activate tutor mode for simpler explanations, guided walkthroughs, analogies and active recall exercises." },
      { title: "Extract key concepts", description: "Identify definitions, conceptual frameworks and memory anchors from any material so you study what really matters." },
      { title: "Create and manage your decks", description: "Build, label and organise decks manually while AI fills the gaps automatically." },
    ],
    pricing: [
      { label: "Research tools", price: "$20/mo", desc: "Standalone AI research assistant.", items: ["Great for finding sources and reports", "Not designed for memorisation", "Students still need a second tool"] },
      { label: "Flashcard tools", price: "$30/yr", desc: "Standalone flashcard flow.", items: ["Great for long-term spaced repetition", "Very limited research help", "Manual card creation for most users"] },
      { label: "Neuvra", price: "All in one", desc: "Research, explanation, tutoring and flashcards in one connected flow.", items: ["Ask, understand, remember", "Research to review without switching apps", "Built for students and academic researchers"], featured: true },
    ],
    study: {
      pageTitle: "Study", generate: "Generate flashcards", manualNav: "Create manually", review: "Review flashcards", tutor: "Tutor mode", decks: "My decks", recentDecks: "Recent decks", home: "Home", research: "Research",
      noDecksTitle: "No decks yet", noDecksDesc: "Generate flashcards from the left panel and save your first deck to start reviewing.", pickDeckTitle: "Review flashcards", pickDeckDesc: "Choose a deck to start studying.",
      cardOf: "Card {current} of {total}", answered: "{n} answered", sessionDone: "Session complete", sessionDoneDesc: "You reviewed {total} cards from {deck}.", easy: "Easy", hard: "Hard", wrong: "Need review", reviewAgain: "Review again",
      tutorTitle: "Tutor mode", tutorDesc: "Type the topic you want to learn and Neuvra will explain it step by step, checking your understanding at each stage.", tutorPlaceholder: "E.g. photosynthesis, Bayes theorem, the immune system...", tutorStart: "Start session ->", tutorNewTopic: "New topic", tutorHeader: "Tutor mode", tutorSubheader: "Answer the tutor's questions to advance through the topic.", tutorExamples: ["Basic quantum mechanics", "Behavioral economics", "The immune system", "Machine Learning"],
      myDecksTitle: "My decks", loadingDecks: "Loading decks", loadingDecksDesc: "Fetching your saved decks.", noSavedDecks: "No saved decks", noSavedDecksDesc: "Generate flashcards with AI and save your first deck for it to appear here.", deckSaved: "Save", deckEdit: "Edit", deckReview: "Review ->", deckDelete: "Delete", deckCancel: "Cancel", deckCard: "card", deckCards: "cards", send: "Send",
      manualEyebrow: "Manual creation",
      manualTitle: "Create your own flashcards",
      manualDesc: "Write your own questions and answers, then save them as a deck alongside the AI-generated ones.",
      manualDeckPlaceholder: "Deck name",
      manualQuestionLabel: "Question",
      manualQuestionPlaceholder: "Write the prompt or question you want to remember...",
      manualAnswerLabel: "Answer",
      manualAnswerPlaceholder: "Write the answer, explanation or key idea...",
        manualReferenceTitle: "Reference material",
        manualReferenceLoaded: "Loaded:",
        manualReferencePlaceholder: "Imported text or notes will appear here so you can build cards from them manually...",
        manualRemoveReference: "Remove imported file",
        manualPreviewTitle: "Preview and customize",
        manualUseImportedImage: "Use imported image",
      manualCustomize: "Customize card",
      manualAddCard: "Add card",
      manualSaveDeck: "Save manual deck",
      manualSaved: "Saved",
      manualSaving: "Saving...",
      manualError: "Add at least one card with both question and answer before saving.",
    },
    researchPage: { pageTitle: "Research", home: "Home", study: "Study", bgColor: "Background", font: "Font", fontDefault: "Default" },
    researchPrefs: { label: "Appearance", bg: "Background", font: "Font", reset: "Reset" },
    common: { darkMode: "Dark", lightMode: "Light", language: "Language", en: "English", es: "Spanish" },
  },
  es: {
    nav: { home: "Inicio", research: "Investigacion", study: "Estudio", howItWorks: "Como funciona", openApp: "Usar Neuvra" },
    landing: {
      eyebrow: "Flujos de investigacion + herramientas de memoria",
      headline: "Neuvra conecta el entendimiento y el recuerdo.",
      sub: "La pagina de inicio muestra el flujo completo. Las paginas independientes te llevan directamente al modo que necesitas.",
      ctaPrimary: "Empezar a estudiar ->",
      ctaSecondary: "Ir a Investigacion",
      proofResearch: "Investigacion primero",
      proofRetention: "Retencion incluida",
      proofTool: "Se siente como una herramienta",
      proofResearchDesc: "Subi material, resume ideas clave y genera resultados academicos estructurados desde un solo flujo.",
      proofRetentionDesc: "Convierte cualquier resultado en flashcards, explicaciones mas simples y mazos que puedes repasar de verdad.",
      proofToolDesc: "Flujos guiados, paneles limpios y acciones de estudio enfocadas, no un chat generico.",
      featuresTitle: "Investigacion y retencion, por fin en un solo producto.",
      featuresSub: "La mayoria de los estudiantes usa una herramienta para entender y otra para memorizar. Neuvra conecta los dos lados.",
      researchLabel: "Flujos academicos",
      researchHeading: "Investigacion",
      researchEngine: "Motor de investigacion",
      studyLabel: "Flujos de retencion",
      studyHeading: "Estudio",
      studyEngine: "Motor de estudio",
      goResearch: "Ir a Investigacion ->",
      goStudy: "Ir a Estudio ->",
      workflowTitle: "Un solo flujo, de la pregunta al repaso.",
      workflowSub: "En lugar de leer un paper en una app y construir flashcards en otra, Neuvra mantiene tu investigacion y tu repaso en el mismo lugar.",
      step1title: "1. Pregunta o sube material",
      step1: "Empieza con un paper, tus apuntes de clase, un capitulo o un PDF completo.",
      step2title: "2. Entiende el material",
      step2: "Genera resumenes, revisiones de literatura o explicaciones simples antes de memorizar.",
      step3title: "3. Extrae lo que importa",
      step3: "Identifica conceptos clave, definiciones, areas debiles y probables focos de examen del mismo material que leiste.",
      step4title: "4. Conviertelo en repaso",
      step4: "Crea flashcards y mazos desde la misma fuente sin copiar y pegar entre herramientas.",
      pricingTitle: "Por que pagar dos herramientas si una hace las dos cosas?",
      pricingSub: "El asistente de investigacion que ya usas cuesta mas que Neuvra y no te ayuda a recordar nada.",
      waitlistEyebrow: "Acceso anticipado",
      waitlistTitle: "Entiende primero. Recuerda despues.\nLas dos cosas en un solo lugar.",
      waitlistSub: "Neuvra no es solo otra app de flashcards ni otro asistente de investigacion con IA. Es la capa que conecta comprension, sintesis y memoria.",
      waitlistPlaceholder: "tu@email.com",
      waitlistBtn: "Unirme a la lista ->",
      waitlistJoining: "Uniendome...",
      waitlistCount: "Ya hay {n} estudiantes e investigadores esperando el acceso anticipado.",
      waitlistDone: "Listo. Estas en la lista y te avisaremos cuando abra el acceso anticipado.",
      footerTagline: "Investigacion y retencion en un flujo conectado. Hecho para estudiantes e investigadores que quieren entender primero y recordar despues.",
      footerProduct: "Producto",
      footerCompany: "Empresa",
      footerLegal: "Privacidad y Terminos",
      footerAbout: "Nosotros",
      footerBlog: "Blog",
      footerContact: "Contacto",
      footerPrivacy: "Politica de privacidad",
      footerTerms: "Terminos de uso",
      footerRights: "Todos los derechos reservados.",
    },
    researchFeatures: [
      { title: "Resume papers al instante", description: "Pega texto o un DOI y obten metodos, hallazgos, limitaciones y conclusiones en segundos." },
      { title: "Genera revisiones de literatura", description: "Convierte una pregunta de investigacion en un panorama estructurado de temas, acuerdos y brechas." },
      { title: "Encuentra papers desde un prompt", description: "Pregunta en lenguaje natural y obten papers relevantes, direcciones de investigacion y puntos de partida." },
      { title: "Organiza tu escritura academica", description: "Obten ayuda para estructurar manuscritos, secciones de discusion y el hilo argumental." },
    ],
    studyFeatures: [
      { title: "Genera flashcards con IA", description: "Transforma papers, clases, PDFs y apuntes en tarjetas de pregunta y respuesta listas para repasar." },
      { title: "Explicame este tema", description: "Activa el modo tutor para obtener explicaciones mas simples, recorridos guiados y ejercicios de recuerdo activo." },
      { title: "Extrae conceptos clave", description: "Identifica definiciones, marcos conceptuales y anclas de memoria de cualquier material." },
      { title: "Crea y gestiona tus mazos", description: "Construye, etiqueta y organiza mazos mientras la IA completa los vacios automaticamente." },
    ],
    pricing: [
      { label: "Herramientas de investigacion", price: "$20/mes", desc: "Asistente de investigacion con IA independiente.", items: ["Excelente para descubrir fuentes y reportes", "No pensado para memorizacion", "Los estudiantes necesitan una segunda herramienta"] },
      { label: "Herramientas de flashcards", price: "$30/año", desc: "Flujo de flashcards independiente.", items: ["Excelente para la repeticion espaciada", "Ayuda de investigacion muy limitada", "Creacion manual de tarjetas para la mayoria"] },
      { label: "Neuvra", price: "Todo en uno", desc: "Investigacion, explicacion, tutoria y flashcards en un flujo conectado.", items: ["Pregunta, entiende y recuerda", "De la investigacion al repaso sin cambiar de app", "Hecho para estudiantes e investigadores"], featured: true },
    ],
    study: {
      pageTitle: "Estudio", generate: "Generar flashcards", manualNav: "Crear manualmente", review: "Repasar flashcards", tutor: "Modo tutor", decks: "Mis mazos", recentDecks: "Mazos recientes", home: "Inicio", research: "Investigacion",
      noDecksTitle: "No tenes mazos todavia", noDecksDesc: "Genera flashcards desde el panel de la izquierda y guarda tu primer mazo para empezar a repasar.", pickDeckTitle: "Repasar flashcards", pickDeckDesc: "Elegi un mazo para empezar a estudiar.",
      cardOf: "Tarjeta {current} de {total}", answered: "{n} respondidas", sessionDone: "Sesion completada", sessionDoneDesc: "Repasaste {total} tarjetas del mazo {deck}.", easy: "Facil", hard: "Dificil", wrong: "A repasar", reviewAgain: "Volver a repasar",
      tutorTitle: "Modo tutor", tutorDesc: "Escribe el tema que quieres aprender y Neuvra te va a explicar paso a paso, verificando tu comprension en cada etapa.", tutorPlaceholder: "Ej: fotosintesis, teorema de Bayes, sistema inmune...", tutorStart: "Empezar sesion ->", tutorNewTopic: "Nuevo tema", tutorHeader: "Modo tutor", tutorSubheader: "Responde las preguntas del tutor para avanzar en el tema.", tutorExamples: ["Mecanica cuantica basica", "Economia conductual", "El sistema inmune", "Machine Learning"],
      myDecksTitle: "Mis mazos", loadingDecks: "Cargando mazos", loadingDecksDesc: "Estamos trayendo tus decks guardados.", noSavedDecks: "No tenes mazos guardados", noSavedDecksDesc: "Genera flashcards con IA y guarda tu primer mazo para que aparezca aca.", deckSaved: "Guardar", deckEdit: "Editar", deckReview: "Repasar ->", deckDelete: "Eliminar", deckCancel: "Cancelar", deckCard: "tarjeta", deckCards: "tarjetas", send: "Enviar",
      manualEyebrow: "Creacion manual",
      manualTitle: "Crea tus propias flashcards",
      manualDesc: "Escribe tus propias preguntas y respuestas, y guardalas como mazo junto con las generadas por IA.",
      manualDeckPlaceholder: "Nombre del mazo",
      manualQuestionLabel: "Pregunta",
      manualQuestionPlaceholder: "Escribe la consigna o pregunta que quieres recordar...",
      manualAnswerLabel: "Respuesta",
      manualAnswerPlaceholder: "Escribe la respuesta, explicacion o idea clave...",
        manualReferenceTitle: "Material de referencia",
        manualReferenceLoaded: "Cargado:",
        manualReferencePlaceholder: "El texto o apuntes importados apareceran aca para que armes tarjetas manualmente...",
        manualRemoveReference: "Quitar archivo importado",
        manualPreviewTitle: "Vista previa y personalizacion",
        manualUseImportedImage: "Usar imagen importada",
      manualCustomize: "Personalizar tarjeta",
      manualAddCard: "Agregar tarjeta",
      manualSaveDeck: "Guardar mazo manual",
      manualSaved: "Guardado",
      manualSaving: "Guardando...",
      manualError: "Agrega al menos una tarjeta con pregunta y respuesta antes de guardar.",
    },
    researchPage: { pageTitle: "Investigacion", home: "Inicio", study: "Estudio", bgColor: "Fondo", font: "Fuente", fontDefault: "Por defecto" },
    researchPrefs: { label: "Apariencia", bg: "Fondo", font: "Fuente", reset: "Restablecer" },
    common: { darkMode: "Oscuro", lightMode: "Claro", language: "Idioma", en: "Ingles", es: "Espanol" },
  },
} as const;

export type Dictionary = (typeof DICT)[Lang];

interface LangCtx {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

const LangContext = createContext<LangCtx>({
  lang: "en",
  t: DICT.en,
  setLang: () => {},
  toggle: () => {},
});

const STORAGE_KEY = "noesis_lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "es") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    localStorage.setItem(STORAGE_KEY, nextLang);
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "en" ? "es" : "en");
  }, [lang, setLang]);

  const value = useMemo(
    () => ({ lang, t: DICT[lang], setLang, toggle }),
    [lang, setLang, toggle],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangCtx {
  return useContext(LangContext);
}
