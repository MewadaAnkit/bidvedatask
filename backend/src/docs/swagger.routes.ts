import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDoc from './swagger.json';

const router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDoc, {
  customSiteTitle: 'Mini RFQ Portal API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

export default router;
