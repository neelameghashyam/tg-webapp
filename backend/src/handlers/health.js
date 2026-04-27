export const health = (c) => {
  return c.json({
    status: 'healthy',
    service: 'tg-template-webapp-backend',
    timestamp: new Date().toISOString(),
  });
};
