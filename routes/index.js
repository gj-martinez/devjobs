const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const vacantesController = require('../controllers/vacantesController');
const usuarioController = require('../controllers/usuarioController');
const authController = require('../controllers/authController');

module.exports = () => {
    router.get('/', homeController.mostrarTrabajos);

    //crear Vacantes
    router.get('/vacantes/nueva', 
        authController.verificarUsuario,
        vacantesController.formularioNuevaVacante
    );
    router.post('/vacantes/nueva',
        authController.verificarUsuario,
        vacantesController.validarVacante,
        vacantesController.agregarVacante
    );

    //mostar vacantes (singular)
    router.get('/vacantes/:url', vacantesController.mostrarVacante);

    //editar vacante
    router.get('/vacantes/editar/:url', 
        authController.verificarUsuario,
        vacantesController.formEditarVacante
    );
    router.post('/vacantes/editar/:url', 
        authController.verificarUsuario,
        vacantesController.validarVacante,
        vacantesController.editarVacante
    );

    //eliminar vacante
    router.delete('/vacantes/eliminar/:id', vacantesController.eliminarVacante)

    //crear cuenta
    router.get('/crear-cuenta/', usuarioController.formCrearCuenta);
    router.post('/crear-cuenta/',
        usuarioController.validarRegistro,
        usuarioController.crearUsuario
    );

    //autenticar usuarios
    router.get('/iniciar-sesion', usuarioController.formIniciarSesion);
    router.post('/iniciar-sesion', authController.autenticarUsuario);

    //cerrar sesion
    router.get('/cerrar-sesion',
        authController.verificarUsuario,
        authController.cerrarSesion
    );
    //Resetear Constraseña
    router.get('/reestablecer-password',
        authController.formReestablecerPassword
    );
    router.post('/reestablecer-password',
        authController.enviarToken
    )

    //Resetear Password (Almacenar en la base de datos)
    router.get('/reestablecer-password/:token',
        authController.reestablecerPassword
    );
    router.post('/reestablecer-password/:token',
        authController.guardarPassword
    );

    //panel de administracion
    router.get('/administracion', 
        authController.verificarUsuario,
        authController.mostrarPanel
    );

    //editar perfil
    router.get('/editar-perfil', 
        authController.verificarUsuario,
        usuarioController.formEditarPerfil
        );
    router.post('/editar-perfil',
        authController.verificarUsuario,
      //  usuarioController.validarPerfil,
        usuarioController.subirImagen,
        usuarioController.editarPerfil
        );
    //Recibir mensajes de Candidatos
    router.post('/vacantes/:url',
        vacantesController.subirCV,
        vacantesController.contactar
    );

    //muestras los vacantes por vacantes
    router.get('/candidatos/:id',
        authController.verificarUsuario,
        vacantesController.mostrarCandidatos
    );

    //Buscador de Vacantes
    router.post('/buscador',
        vacantesController.buscadorVacantes
    );

    return router;
}