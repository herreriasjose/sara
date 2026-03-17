
# SARA (Sistema de Análisis y Resiliencia Auto-gestionado)

## TFM-MVP: Detección de Descompensación Emocional mediante EMA y Modelado Bayesiano

Este proyecto es el Producto Mínimo Viable (MVP) desarrollado para el Trabajo Fin de Máster (TFM) del **Máster Universitario en Psicología General Sanitaria (UNIR)**. El sistema combina técnicas de **Evaluación Ecológica Momentaria (EMA)** con inferencia estadística avanzada para la monitorización de pacientes con dolor crónico.

## 🧠 Marco de Investigación
- **Objetivo**: Implementar un modelo bayesiano de regresión logística para predecir crisis emocionales en tiempo real basado en la intensidad del dolor, calidad del sueño y estado de ánimo.
- **Población Diana**: Pacientes con dolor crónico y discapacidad física (en colaboración con asociaciones nacionales).

## 🛠️ Stack Tecnológico
Para garantizar la eficiencia y el ahorro de recursos cognitivos del investigador, la arquitectura está totalmente automatizada:
- **Backend**: Node.js con Express.
- **Frontend**: Motor de plantillas EJS (Optimizado para dispositivos móviles).
- **Base de Datos**: MongoDB Atlas (Cloud).
- **Comunicaciones**: Twilio for WhatsApp API (Automatización de muestreo EMA).
- **Infraestructura**: AWS ECS sobre EC2 con Nginx como Proxy Inverso.
- **Seguridad**: SSL/TLS

## 🚀 Características Principales
1. **Recogida Automatizada**: Programación de triggers vía WhatsApp para minimizar la fatiga del paciente.
2. **Dashboard de Agencia**: Interfaz visual para que el paciente visualice su propia evolución (fomentando la autonomía y agencia).
3. **Robustez Estadística**: Scripts integrados de R/Python para ejecutar el modelo bayesiano sobre los datos recolectados.
4. **Seguridad RGPD**: Encriptación de datos sensibles y flujos de consentimiento informado digital.

## 📋 Requisitos e Instalación
[cite_start]El proyecto es multiplataforma y requiere el uso de un gestor de versiones de Node para garantizar la paridad entre desarrollo (Windows 11) y producción (Linux/AWS ECS)[cite: 633, 634].

### 1. Gestión del Entorno (Node.js v24.14.0 LTS)
* **En Windows**: Utilizar `nvm-windows`.
    ```powershell
    nvm install 24.14.0
    nvm use 24.14.0
    ```
* **En Linux**: Utilizar `nvm` (Node Version Manager).
    ```bash
    nvm install --lts
    nvm use --lts
    ```

### 2. Configuración del Proyecto
1.  Clonar el repositorio.
2.  Crear un archivo `.env` basado en `.env.example`.
3.  Ejecutar `npm install`.
4.  Iniciar en desarrollo: `npm run dev`.

## 👨‍💻 Investigador
**Jose Herrerías Bongolán**
