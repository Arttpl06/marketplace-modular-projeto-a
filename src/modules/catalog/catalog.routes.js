import { Router } from "express";

import { buscarProduto, listar, criar, atualizar, arquivar } from "./catalog.controller.js";

const router = Router();
router.get('/', listar);
router.post('/', criar);
router.patch('/:id', atualizar);
router.delete('/:id', arquivar);

router.get('/:id' , buscarProduto);


export default router;
