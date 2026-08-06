import cors from 'cors';

export const corsMiddleware = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://s1m0ne.tec.br',
    'https://www.s1m0ne.tec.br',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});
