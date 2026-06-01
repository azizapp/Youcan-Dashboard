let app: any = null;
let loadError: any = null;

try {
  const m = await import("../server");
  app = m.default;
} catch (err: any) {
  loadError = {
    message: err.message,
    stack: err.stack,
    toString: err.toString()
  };
}

export default function handler(req: any, res: any) {
  if (loadError) {
    return res.status(500).json({
      success: false,
      error: "Vercel Serverless Function failed to load server.ts",
      details: loadError
    });
  }
  
  if (!app) {
    return res.status(500).json({
      success: false,
      error: "Express app is undefined"
    });
  }
  
  try {
    return app(req, res);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "Runtime error during request execution",
      message: err.message,
      stack: err.stack
    });
  }
}
