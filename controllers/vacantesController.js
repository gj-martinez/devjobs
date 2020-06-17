const mongoose = require('mongoose');
const Vacante = mongoose.model('Vacante');
const multer = require('multer');
const shortid = require('shortid');


exports.formularioNuevaVacante = (req, res) => {
    res.render('nueva-vacante', {
        nombrePagina: 'Nueva Vacante',
        tagline: 'Llena el formulario y publica tu vacante',
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
    });
}

//agregar vacantes a la base de datos
exports.agregarVacante = async (req, res) => {
    const vacante = new Vacante(req.body);
    //usarui autor de la vacante
        vacante.autor = req.user._id;
    //crear arreglo de habilidades(skilss)
    vacante.skills = req.body.skills.split(',');

    //almacenarlo en la base de datos
    const nuevaVacante = await vacante.save();
    //redireccionar
    res.redirect(`/vacantes/${nuevaVacante.url}`);

}

//muestra una vacante

exports.mostrarVacante = async (req,res, next) => {
    const vacante = await Vacante.findOne({url: req.params.url}).populate('autor').lean();
    

    if(!vacante) return next();

    res.render('vacante',{
        vacante,
        nombrePagina : vacante.titulo,
        barra: true
    })
}

exports.formEditarVacante = async (req, res, next) => {

    const vacante = await Vacante.findOne({url: req.params.url}).lean();

    if(!vacante) return next();

    res.render('editar-vacante',{
        vacante,
        nombrePagina: `Editar - ${vacante.titulo}`,
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
    })
}

exports.editarVacante = async (req, res, next) => {
    const vacanteActualizada = req.body;

    vacanteActualizada.skills = req.body.skills.split(',');

    const vacante = await Vacante.findOneAndUpdate({url: req.params.url},
        vacanteActualizada, {
            new: true,
            runValidators: true
        });

    res.redirect(`/vacantes/${vacante.url}`);
}


//validar y sanitizar los camposd e las nuevas vacantes
exports.validarVacante = (req, res, next) => {
    //sanitizar los campos

    req.sanitizeBody('titulo').escape();
    req.sanitizeBody('empresa').escape();
    req.sanitizeBody('ubicacion').escape();
    req.sanitizeBody('salario').escape();
    req.sanitizeBody('contrato').escape();
    req.sanitizeBody('skills').escape();

    //validar
    req.checkBody('titulo', 'Agrega un titulo a la Vacante').notEmpty();
    req.checkBody('empresa', 'Agrega una Empresa').notEmpty();
    req.checkBody('ubicacion', 'Agrega una Ubicacion').notEmpty();
    req.checkBody('contrato', 'Selecciona el tipo de Contrato').notEmpty();
    req.checkBody('skills', 'Agrega al menos una habilidad').notEmpty();


    const errores = req.validationErrors();
    if(errores){
        req.flash('error',errores.map(error => error.msg));

        res.render('nueva-vacante', {
            nombrePagina: 'Nueva Vacante',
            tagline: 'Llena el formulario y publica tu vacante',
            cerrarSesion: true,
            nombre: req.user.nombre,
            mensajes: req.flash()
        });
    }

    next();
}

exports.eliminarVacante = async(req, res, next) => {
    const { id } = req.params;

    const vacante = await Vacante.findById(id);

    if(verificarAutor(vacante, req.user)){
        //todo bien, es el usuario
        vacante.remove();
        res.status(200).send('Vacante eliminada correctamente');
    }else{
        //no permitido
        res.status(403).send('Error');
        
    }

}

const verificarAutor = (vacante = {}, usuario = {}) => {
    if(!vacante.autor.equals(usuario._id)){
        return false
    }
    return true
}
//Subir archivos pdf
exports.subirCV = (req, res, next) => {
    upload(req, res, function(error) {
        if(error){
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error', 'El archivo es muy grande: Maximo 500kb');
                }else{
                    req.flash('error', error.message);
                }
            }else{
                req.flash('error',error.message);
            }
            // para que no te muestre el mensaje correcto y no valido en la misma pantalla
            res.redirect('back');
            return;
        }else{
            return next();
        }
    });
}
//opciones de multer
const configuracionMulter = {
    limits : {fileSize : 500000}, 
    storage: fileStorage = multer.diskStorage({
        destination : (req, file, cb) => {
            cb(null, __dirname+'../../public/uploads/cv')
        },
        filename : (req, file, cb) => {
            const extension = file.mimetype.split('/')[1];
            cb(null,`${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req, file, cb){
        if(file.mimetype === 'application/pdf'){
            //el callback se ejecuta como true o false : true cuando la imagen es correcta
            cb(null, true);
        }else{
            cb(new Error('Formato no válido'), false);
        }
    }
}

const upload = multer(configuracionMulter).single('cv');

//almacenar los candidatos en la bd
exports.contactar = async(req, res, next) => {
    const vacante = await Vacante.findOne({url : req.params.url});
    //si no hay vacantes
    if(!vacante) return next();

    //todo bien, construir el nuevo objeto
    const nuevoCandidato = {
        nombre: req.body.nombre,
        email: req.body.email,
        cv: req.file.filename
    }

    //almacenar en la bd la vacante
    vacante.candidato.push(nuevoCandidato);
    vacante.save();

    //mensaje flash y redirect
    req.flash('correcto', 'Se envió correctamente tu curriculum')
    res.redirect('/');
}

exports.mostrarCandidatos = async (req, res, next) =>{
    const vacante = await Vacante.findById(req.params.id).lean();

    if(vacante.autor != req.user._id.toString()){
        return next();
    }
    if(!vacante) return next();
    
    res.render('candidatos', {
        nombrePagina: `Candidatos Vacante - ${vacante.titulo}`,
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
        candidatos: vacante.candidato
    })
}

//buscador de vacantes
exports.buscadorVacantes = async (req, res) =>{
    const vacantes = await Vacante.find({
        $text : {
            $search : req.body.q
        }
    }).lean();

    //mostrar vacantes
    res.render('home',{
        nombrePagina : `Resultado para la búsqueda : ${req.body.q}`,
        barra: true,
        vacantes
    });
}