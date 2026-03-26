async function seed() {
  // Fase 1: sin datos de dominio.
  console.info('Seed base ejecutado: sin registros por ahora.');
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
