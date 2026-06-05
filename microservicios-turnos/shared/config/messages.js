const messages = Object.freeze({
    system: {
        common: {
            errors: {
                unexpected: 'Ocurrió un error inesperado. Intenta nuevamente.',
                notFound: 'Registro no encontrado.',
                idRequired: 'El ID es requerido.',
                permissionDenied: 'No tienes permisos para realizar esta acción.',
                userIdRequired: 'El user_id es requerido.',
                invalidUserInToken: 'Token inválido o sin usuario asociado.',
                misconfiguredAuthorization: 'Configuración de seguridad inválida en el servidor.',
                tooManyRequests: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
                externalConnectionFailed: 'Ocurrió un error con los datos que estás enviando'
            }
        },
        http: {
            errors: {
                routeNotFoundPrefix: 'Ruta no encontrada'
            }
        },
        auth: {
            errors: {
                loginRequired: 'Debes iniciar sesión para continuar.',
                authorizationRequired: 'Autorización requerida.',
                credentialsInvalid: 'Credenciales inválidas.',
                tokenExpired: 'El token ingresado ha expirado.',
                tokenInvalid: 'El token ingresado no es válido.',
                tokenNotFound: 'El token ingresado no fue encontrado.'
            }
        },
        validation: {
            errors: {
                fieldsRequired: 'Todos los campos requeridos deben ser completados',
                invalidStatus: 'El estado proporcionado no es válido',
                invalidEnumValue: 'El valor proporcionado no está permitido',
                requestInvalid: 'Error de validación en los campos ingresados',
            }
        }
    },
    entities: {
        appointment: {
            errors: {
                notFound: 'Turno no encontrado.',
                slotUnavailable: 'El horario seleccionado no está disponible.',
                alreadyCancelled: 'El turno ya fue cancelado.',
                alreadyCompleted: 'El turno ya fue completado.',
                conflictExists: 'Ya existe un turno en ese horario.',
                invalidDateRange: 'El rango de fechas es inválido.',
                pastDate: 'No se puede reservar un turno en el pasado.',
                advanceLimitExceeded: 'La fecha excede el límite de reserva anticipada.',
                invalidEmail: 'El email ingresado no es válido.',
                invalidPhone: 'El teléfono ingresado no es válido.',
                contactRequired: 'Se requiere un email o un teléfono de contacto.',
            },
            success: {
                list: 'Turnos obtenidos correctamente.',
                fetch: 'Turno obtenido correctamente.',
                created: 'Turno creado correctamente.',
                updated: 'Turno actualizado correctamente.',
                cancelled: 'Turno cancelado correctamente.',
                confirmed: 'Turno confirmado correctamente.',
                completed: 'Turno marcado como completado.',
                noShow: 'Turno marcado como ausente.',
            }
        },
        availability: {
            success: {
                fetch: 'Disponibilidad obtenida correctamente.',
            }
        },
        professional: {
            errors: {
                notFound: 'Profesional no encontrado.',
            },
            success: {
                list: 'Profesionales obtenidos correctamente.',
                fetch: 'Profesional obtenido correctamente.',
                created: 'Profesional creado correctamente.',
                updated: 'Profesional actualizado correctamente.',
                deleted: 'Profesional eliminado correctamente.',
                toggled: 'Estado del profesional actualizado correctamente.',
            }
        },
        service: {
            errors: {
                notFound: 'Servicio no encontrado.',
            },
            success: {
                list: 'Servicios obtenidos correctamente.',
                fetch: 'Servicio obtenido correctamente.',
                created: 'Servicio creado correctamente.',
                updated: 'Servicio actualizado correctamente.',
                deleted: 'Servicio eliminado correctamente.',
                toggled: 'Estado del servicio actualizado correctamente.',
            }
        },
        schedule: {
            errors: {
                notFound: 'Horario no encontrado.',
                exceptionNotFound: 'Excepción de horario no encontrada.',
            },
            success: {
                list: 'Horarios obtenidos correctamente.',
                created: 'Horario creado correctamente.',
                updated: 'Horario actualizado correctamente.',
                deleted: 'Horario eliminado correctamente.',
                exceptionCreated: 'Excepción de horario creada correctamente.',
                exceptionUpdated: 'Excepción de horario actualizada correctamente.',
                exceptionDeleted: 'Excepción de horario eliminada correctamente.',
                exceptionList: 'Excepciones obtenidas correctamente.',
            }
        },
        clientContact: {
            errors: {
                notFound: 'Contacto no encontrado.',
            },
            success: {
                list: 'Contactos obtenidos correctamente.',
                fetch: 'Contacto obtenido correctamente.',
                created: 'Contacto creado correctamente.',
                updated: 'Contacto actualizado correctamente.',
                deleted: 'Contacto eliminado correctamente.',
            }
        },
        businessConfig: {
            errors: {
                notFound: 'Configuración del negocio no encontrada.',
                apiKeyInvalid: 'API key inválida o no encontrada.',
            },
            success: {
                fetch: 'Configuración obtenida correctamente.',
                updated: 'Configuración actualizada correctamente.',
            }
        },
        analytics: {
            success: {
                fetch: 'Estadísticas obtenidas correctamente.',
            }
        },
        whatsapp: {
            success: {
                processed: 'Mensaje procesado correctamente.',
            }
        },
        widget: {
            success: {
                config: 'Configuración del widget obtenida correctamente.',
                availability: 'Disponibilidad obtenida correctamente.',
                booked: 'Turno reservado correctamente.',
            }
        }
    }
});

export default messages;
