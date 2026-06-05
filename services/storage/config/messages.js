export default {
    generic: {
        autorization_required: 'Se requiere autorización para acceder al servicio de almacenamiento de archivos.',
        credential_invalid: 'Las credenciales de acceso al almacenamiento son inválidas.',
        error: 'Ocurrió un error inesperado en el servicio de almacenamiento. Intentá nuevamente.',
        fields_empty: 'Faltan campos obligatorios en la solicitud.',
        id_required: 'El identificador del archivo es obligatorio para completar esta operación.',
        login_required: 'Necesitás iniciar sesión para acceder al servicio de almacenamiento.',
        permission_denied: 'No tenés permisos para acceder a este archivo o carpeta.',
        token_expirated: 'Tu sesión ha expirado. Iniciá sesión nuevamente para continuar.',
        token_invalid: 'El token de autenticación no es válido.',
        token_not_found: 'No se encontró el token de autenticación en la solicitud.',
        file_not_found: 'No se encontró el archivo solicitado en el almacenamiento.',
    },
    success: {
        upload: 'El archivo fue subido exitosamente.',
        delete: 'El archivo fue eliminado correctamente del almacenamiento.',
        get: 'Archivo obtenido exitosamente.',
    },
    error: {
        upload: {
            fields_empty: {
                file: 'Debés seleccionar al menos un archivo para subir.',
                bucket: 'Debés especificar la carpeta de destino para el archivo.',
            },
            error: 'No pudimos completar la carga del archivo. Verificá el tamaño y formato.',
            file_too_large: 'El archivo supera el tamaño máximo permitido. El límite es {limit}.',
            invalid_format: 'El formato del archivo no está permitido. Formatos aceptados: {formats}.',
            invalid_type: 'El tipo de archivo no pudo ser detectado. Asegurate que sea un archivo válido.',
            processing_error: 'Ocurrió un error al procesar el archivo. Intentá con otro formato.',
            storage_error: 'No pudimos guardar el archivo en el almacenamiento. Intentá nuevamente.',
        },
        delete: {
            error: 'No pudimos eliminar el archivo. Puede que no exista o ya haya sido eliminado.',
            permission_denied: 'No tenés permisos para eliminar este archivo.',
            invalid_key: 'El nombre de archivo no es válido.',
        },
        get: {
            error: 'No pudimos obtener el archivo solicitado del almacenamiento.',
            not_found: 'El archivo que buscas no existe o fue eliminado.',
            invalid_key: 'El nombre de archivo no es válido.',
        },
    },
};
