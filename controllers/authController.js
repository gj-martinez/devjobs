const passport = require('passport');
const mongoose = require('mongoose');
const Vacantes = mongoose.model('Vacante');
const Usuarios = mongoose.model('Usuario');
const crypto = require('crypto');
const enviarEmail = require('../handlers/email');


exports.autenticarUsuario = passport.authenticate('local', {
    successRedirect: '/administracion',
    failureRedirect: '/iniciar-sesion',
    failureFlash: true,
    badRequestMessage: 'Ambos campos son obligatorio'
});

//Revisar si el usuario esta autenticado o no
exports.verificarUsuario = (req, res, next) =>{

    //verificar el usuario
    if(req.isAuthenticated()){
        return next();
    }
    //redireccionar
    res.redirect('/iniciar-sesion');
}

exports.mostrarPanel = async(req, res) => {
    //consultar el usuario autenticado
    const vacantes = await Vacantes.find({autor: req.user._id}).lean();


    res.render('administracion',{
        nombrePagina: 'Panel de Administracion',
        tagline: 'Crea y Administra tus vacantes desde aqui',
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
        vacantes
    })
} 

exports.cerrarSesion = (req, res) => {
    req.logout(); 
    req.flash('correcto', 'Cerraste sesion correctamente');
    return res.redirect('/iniciar-sesion');
}

//Formulario para reestablecer password
exports.formReestablecerPassword = (req, res) => {
    res.render('reestablecer-password',{
        nombrePagina: 'Reestablece tu password',
        tagline: 'Si ya tienes una cuenta pero te olvidaste tu password, colaca tu email'
    })
}
//Genera el token en la tabla de usuario
exports.enviarToken = async(req, res) =>{
    const usuario = await Usuarios.findOne({email: req.body.email});

    if(!usuario){
        req.flash('error', 'No existe esa cuenta');
        return res.redirect('/iniciar-sesion');
    }
    //si existe usuario, generar token
    usuario.token = crypto.randomBytes(20).toString('hex');
    usuario.expira = Date.now() + 3600000;

    //se guarda el token y expira
    await usuario.save();
    const resetUrl = `http://${req.headers.host}/reestablecer-password/${usuario.token}`;

    //enviar notifiaciones por email
    await enviarEmail.enviar({
        usuario,
        subject: 'Password Reset',
        resetUrl,
        archivo: 'reset'
    });


    //todo correcto
    req.flash('correcto', 'Revisa tu email para las indicaciones');
    res.redirect('/iniciar-sesion');

} 

//Valida si el token es valido y si el usuario existe, muestra la vista

exports.reestablecerPassword = async(req, res) => {
    const usuario = await Usuarios.findOne({
        token: req.params.token,
        expira: {
            $gt : Date.now()
        }
    });

    if(!usuario){
        req.flash('error', 'Formulario ya no es valido, intente de nuevo');
        return res.redirect('/reestablecer-password');
    }

    //todo bien, mostrar el formulario
    res.render('nuevo-password',{
        nombrePagina: 'Nuevo Password'
    })
}

//alamcena el nuevo password en la base de datos
exports.guardarPassword = async(req, res) => {
    const usuario = await Usuarios.findOne({
        token: req.params.token,
        expira: {
            $gt : Date.now()
        }
    });

    //no existe el usuario o el token no valido
    if(!usuario){
        req.flash('error', 'Formulario ya no es valido, intente de nuevo');
        return res.redirect('/reestablecer-password');
    }

    //asignar nuevo password, limpiar valores previos
    usuario.password = req.body.password
    usuario.token = undefined;
    usuario.expira = undefined;

    //guardar en la base de datos
    await usuario.save()

    //reedirigir
    req.flash('correcto', 'Password Modificado correctamente');
    res.redirect('/iniciar-sesion')
}