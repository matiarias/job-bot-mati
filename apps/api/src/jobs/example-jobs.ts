import type { Job } from '@job-bot/contracts';

export const exampleJobs: Job[] = [
  {
    id: 'litoral', company: 'Litoral Tech', title: 'Frontend Engineer', location: 'Remoto desde Argentina',
    contract: 'Tiempo completo', salary: 'No publicado', skills: ['React', 'TypeScript', 'Testing Library'], date: '2026-11-06',
    description: 'El equipo desarrolla una plataforma de pagos para comercios de Latinoamérica. El rol se enfoca en la experiencia de cobros, el sistema de diseño y el rendimiento de los flujos de compra.',
    matches: ['React y TypeScript son el stack principal del producto.', 'El equipo admite trabajo remoto desde Argentina.', 'El rol prioriza accesibilidad y pruebas de interfaz.'],
    questions: [],
  },
  {
    id: 'pampa', company: 'Pampa Labs', title: 'Frontend Developer', location: 'Remoto en LATAM',
    contract: 'Contractor', salary: 'USD 2.800–3.500 / mes', skills: ['Next.js', 'React', 'TypeScript'], date: '2026-11-05',
    description: 'El equipo construye herramientas para administrar catálogos y pedidos. El rol trabaja sobre componentes compartidos y nuevas pantallas para clientes.',
    matches: ['El rol usa React y TypeScript a diario.'],
    questions: ['Confirmar si piden experiencia en producción con App Router.'],
  },
  {
    id: 'andes', company: 'Andes Digital', title: 'Software Engineer · Frontend', location: 'Remoto desde Argentina',
    contract: 'Tiempo completo', salary: 'No publicado', skills: ['React', 'TypeScript', 'Vite'], date: '2026-11-04',
    description: 'El producto ayuda a equipos pequeños a coordinar entregas. El rol desarrolla interfaces para planificación y seguimiento.',
    matches: ['El stack incluye React, Vite y TypeScript.', 'La vacante admite trabajo desde Argentina.'],
    questions: [],
  },
  {
    id: 'rio', company: 'Río Code', title: 'React Engineer', location: 'Remoto global',
    contract: 'Contractor', salary: 'USD 3.000 / mes', skills: ['React', 'TypeScript'], date: '2026-11-03',
    description: 'El equipo mantiene un editor colaborativo. El rol trabaja en la edición de documentos y en mejoras de rendimiento del cliente web.',
    matches: ['El trabajo se concentra en React y TypeScript.'],
    questions: ['Confirmar si el horario se superpone con la jornada en Argentina.'],
  },
  {
    id: 'delta', company: 'Delta Studio', title: 'Frontend Engineer', location: 'Remoto desde Argentina',
    contract: 'Tiempo completo', salary: 'No publicado', skills: ['React', 'CSS', 'Storybook'], date: '2026-11-02',
    description: 'El equipo diseña y mantiene componentes accesibles para productos web. El rol implementa patrones de navegación y formularios.',
    matches: ['El puesto se centra en interfaces accesibles y componentes reutilizables.'],
    questions: [],
  },
];
