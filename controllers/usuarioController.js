const mongoose = require('mongoose');
const Usuarios = mongoose.model('Usuario');
const multer = require('multer');
const shortid = require('shortid');

exports.subirImagen = (req, res, next) => {
    upload(req, res, function(error) {
        if(error){
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error', 'El archivo es muy grande: Maximo 100kb');
                }else{
                    req.flash('error', error.message);
                }
            }else{
                req.flash('error',error.message);
            }
            // para que no te muestre el mensaje correcto y no valido en la misma pantalla
            res.redirect('/administracion');
            return;
        }else{
            return next();
        }
    });
}
//opciones de multer
const configuracionMulter = {
    limits : {fileSize : 100000}, 
    storage: fileStorage = multer.diskStorage({
        destination : (req, file, cb) => {
            cb(null, __dirname+'../../public/uploads/perfiles')
        },
        filename : (req, file, cb) => {
            const extension = file.mimetype.split('/')[1];
            cb(null,`${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req, file, cb){
        if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
            //el callback se ejecuta como true o false : true cuando la imagen es correcta
            cb(null, true);
        }else{
            cb(new Error('Formato no válido'), false);
        }
    }
}

const upload = multer(configuracionMulter).single('imagen');

exports.formCrearCuenta = (req, res) => {
    res.render('crear-cuenta',{
        nombrePagina: 'Crear Cuenta en debJobs',
        tagline: 'Comineza a publicar tus vacantes gratis, solo debes crear una cuenta'
    });
} 
exports.validarRegistro = (req, res,next) => {

    //sanitizar los datos del body
    req.sanitizeBody('nombre').escape();
    req.sanitizeBody('email').escape();
    req.sanitizeBody('password').escape();
    req.sanitizeBody('confirmar').escape();

    //validar 
    req.checkBody('nombre', 'El nombre es Obligatorio').notEmpty();
    req.checkBody('email', 'El email debe ser valido').isEmail();
    req.checkBody('password', 'El password no puede ir vacio').notEmpty();
    req.checkBody('confirmar', 'Confirmar password no puede ir vacio').notEmpty();
    req.checkBody('confirmar', 'El password es diferente').equals(req.body.password);

    const errores = req.validationErrors();

    if(errores){
        //si hay errores
        req.flash('error',errores.map(error => error.msg));

        res.render('crear-cuenta', {
            nombrePagina: 'Crear Cuenta en debJobs',
            tagline: 'Comineza a publicar tus vacantes gratis, solo debes crear una cuenta',
            mensajes: req.flash()
        });
        return;
    };

    //si no hay errores
    next();
}
exports.crearUsuario = async (req, res, next) => {
    const usuario = new Usuarios(req.body);

    try {
        await usuario.save();
        res.redirect('/iniciar-sesion');
    } catch (error) {
        req.flash('error', error);
        res.redirect('/crear-cuenta');
    }
}

exports.formIniciarSesion = (req, res) => {
    res.render('iniciar-sesion',{
        nombrePagina: 'Iniciar Sesion devJobs'
    });
}

exports.formEditarPerfil = async(req, res) => {
    const usuario = await Usuarios.findById(req.user._id).lean();

    res.render('editar-perfil',{
        nombrePagina: 'Edita tu perfil en devJobs',
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
        usuario
        });
}

exports.editarPerfil = async (req, res) => {
    const usuario = await Usuarios.findById(req.user._id);

    usuario.nombre = req.body.nombre;
    usuario.email = req.body.email;
    if(req.body.password){
        usuario.password = req.body.password;
    }

    if(req.file){
        usuario.imagen = req.file.filename;
    }

    await usuario.save();

    req.flash('correcto', 'cambios guardados correctamente');

    res.redirect('/administracion');
}
//sanitizar y validar el formulario de editar perfiles
exports.validarPerfil = async(req, res, next) => {
    const usuario = await Usuarios.findById(req.user._id).lean();

    //sanitizar
    req.sanitizeBody('nombre').escape();
    req.sanitizeBody('email').escape();
    if(req.body.password){
        req.sanitizeBody('password').escape();
    };

    //validar

    req.checkBody('nombre', 'Nombre no puede ir vacio').notEmpty();
    req.checkBody('email', 'Correo no puede ir vacio').notEmpty();

    const errores = req.validationErrors();

    if(errores){
        req.flash('error', errores.map(error => error.msg));

        res.render('editar-perfil',{
            nombrePagina: 'Edita tu perfil en devJobs',
            cerrarSesion: true,
            nombre: req.user.nombre,
            imagen: req.user.imagen,
            usuario,
            mensajes: req.flash()
            });
    }
}
