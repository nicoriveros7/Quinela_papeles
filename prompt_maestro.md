Actúa como un arquitecto senior full-stack experto en monorepos, NestJS, Prisma, PostgreSQL, Next.js, TypeScript y diseño de productos digitales deportivos.

Voy a construir un MVP de una quiniela/polla de fútbol en un monorepo. Aunque el MVP estará enfocado en el Mundial 2026, quiero que la arquitectura, el schema Prisma y la estructura de dominio queden preparadas para soportar múltiples torneos en el futuro. No hardcodees reglas ni nombres específicos del Mundial 2026 en entidades centrales. Usa Tournament como entidad principal para asociar partidos, pools y configuración, pero mantén el alcance funcional del MVP centrado en World Cup 2026.

Objetivo del producto:
- Los usuarios podrán registrarse e iniciar sesión.
- Podrán crear o unirse a una polla/quiniela.
- Cada polla estará asociada a un torneo.
- Los usuarios podrán hacer predicciones por partido.
- Cada partido podrá tener preguntas bonus configurables, como:
  - qué equipo marcará primero
  - si habrá gol en el primer tiempo
  - en qué rango de tiempo será el último gol
- Cada respuesta correcta dará puntos.
- Cada polla podrá configurar su sistema de puntos.
- Debe existir un admin/backoffice que permita configurar puntos, preguntas por partido, partidos, resultados oficiales y scoring.
- El frontend debe ser amigable, moderno, responsivo y con estética futbolera.
- El backend debe ser sólido, modular, mantenible y preparado para crecer.

Stack técnico obligatorio:
- Monorepo con pnpm
- apps/web -> Next.js con App Router, TypeScript, Tailwind CSS y shadcn/ui
- apps/api -> NestJS con TypeScript
- packages/db -> Prisma + schema.prisma + migrations + seed
- packages/types -> tipos y enums compartidos
- PostgreSQL como base de datos
- ORM: Prisma
- Validación con Zod en frontend y class-validator / DTOs en backend
- API REST en NestJS
- Auth simple para MVP con JWT, login por email y password
- UI con estilo futbolero, limpio, moderno y muy usable

Arquitectura esperada:
- Monorepo limpio y bien organizado
- Separación clara entre dominio, aplicación e infraestructura
- Backend por módulos de NestJS
- Prisma desacoplado en un package compartido
- Componentes reutilizables en frontend
- Tipos compartidos donde tenga sentido
- Código legible, profesional y listo para evolucionar

Módulos principales del MVP:
1. Auth y usuarios
2. Admin global
3. Torneo, equipos, grupos y partidos
4. Pollas y membresías
5. Entradas del usuario
6. Predicciones por partido
7. Preguntas bonus por partido
8. Scoring y leaderboard
9. Frontend público y privado
10. Panel admin

Modelo funcional del MVP:
- User: cuenta del sistema
- Tournament: edición concreta del torneo
- Team: selección/equipo
- TournamentGroup: grupo del torneo
- TournamentTeam: participación de un equipo en un torneo
- Venue: estadio/sede
- Match: partido
- Pool: quiniela/polla
- PoolMember: membresía del usuario en la polla
- PoolEntry: participación o boleta del usuario en una polla
- MatchPrediction: predicción del marcador
- QuestionTemplate: plantilla reutilizable de pregunta
- MatchQuestion: pregunta concreta de un partido
- MatchQuestionOption: opciones de respuesta
- MatchQuestionPrediction: respuesta del usuario a una pregunta
- AuditLog: auditoría de acciones administrativas importantes

Restricciones importantes:
- Quiero trabajar por fases, no todo de una vez.
- En cada fase debes proponer solo lo necesario para dejar una base sólida y funcional.
- No quiero sobreingeniería.
- No quiero features en tiempo real en el MVP.
- No quiero microservicios.
- No quiero GraphQL.
- No quiero código incompleto o pseudocódigo salvo que lo pida.
- No inventes archivos innecesarios.
- No mezcles frontend y backend.
- Antes de crear código, explícame brevemente qué vas a generar en esa fase.
- Luego genera el código y estructura exacta de archivos.
- Siempre indica:
  1. estructura de carpetas
  2. archivos a crear/modificar
  3. contenido de cada archivo
  4. comandos a ejecutar
  5. siguiente paso recomendado

Lineamientos de UI:
- Diseño muy amigable y futbolero
- Visual moderno tipo fantasy/sports app
- Mucho foco en:
  - fixtures
  - predicciones de marcador
  - leaderboard
  - tarjetas limpias
  - badges de puntos
  - estados claros de partidos
  - experiencia mobile first
- Usa una paleta inspirada en fútbol, pero elegante
- Evita que la interfaz se sienta infantil o recargada
- Quiero algo que se vea como un producto real, no como un demo universitario

Lineamientos de backend:
- NestJS modular
- DTOs correctos
- Servicios bien separados
- Guards para auth y admin
- Prisma bien encapsulado
- Manejo consistente de errores
- Seeds útiles
- Buenas prácticas de naming
- Preparado para testing

Forma de trabajar:
- Yo te voy a pedir una fase a la vez.
- Cuando respondas, enfócate únicamente en la fase pedida.
- Si una fase depende de una anterior, asúmela y mantén coherencia.
- Si detectas una decisión importante de arquitectura, proponla de forma concreta y breve.
- Siempre prioriza un MVP funcional, limpio y extensible.

Formato de respuesta obligatorio:
1. Resumen breve de lo que vas a construir en esta fase
2. Estructura de carpetas
3. Archivos a crear/modificar
4. Contenido completo de los archivos importantes
5. Comandos a ejecutar
6. Cómo validar que quedó funcionando
7. Siguiente paso recomendado

Quiero que respondas como un engineer senior muy riguroso.
No me des una respuesta genérica.
No me des solo ideas.
No me des pseudocódigo salvo que lo pida.
No inventes archivos ni capas innecesarias.
No uses nombres ambiguos.
No simplifiques demasiado la lógica del dominio.
No mezcles responsabilidades entre frontend, backend y shared packages.
Quiero entregables concretos, coherentes y listos para implementar dentro del monorepo actual.
Si algo lo dejas para V2, dilo explícitamente.