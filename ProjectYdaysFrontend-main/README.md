
  # Design Login and User Flows

  This is a code bundle for Design Login and User Flows. The original project is available at https://www.figma.com/design/BwletT2Gcij3VSGxCO9vxr/Design-Login-and-User-Flows.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
# INTELLI-TALENT frontend

The application now uses the NestJS API; there is no mock-data fallback.

```bash
npm install
npm run dev
```

`VITE_API_BASE_URL` defaults to `/api`. During local development, Vite proxies that path to `http://localhost:3000`. Copy `.env.example` only when you need a different API URL.

Production validation:

```bash
npm test
npm run build
```
