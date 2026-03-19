# SARA (Sistema de Análisis y Resiliencia Auto-gestionado)

## TFM-MVP: Predicción de Descompensación Emocional mediante iAp y Modelado Bayesiano

Este proyecto representa el Producto Mínimo Viable (MVP) para el Trabajo Fin de Máster (TFM) del **Máster Universitario en Psicología General Sanitaria (UNIR)**. SARA trasciende la monitorización convencional al inscribirse en el marco de la **Psicología Artificial Intricada (iAp)**, combinando **Evaluación Ecológica Momentaria (EMA)** con computación avanzada para la gestión del dolor crónico.

## 🧠 Marco de Investigación (iAp Framework 2025)
A diferencia de los modelos explicativos tradicionales, SARA se centra en la **precisión predictiva** (predictive accuracy) para anticipar crisis emocionales antes de que ocurran:

* **Inferencia ante la Incertidumbre**: Implementación de **Modelado Bayesiano** para gestionar la vaguedad y pérdida de datos inherente al comportamiento humano.
* **Análisis de Redes Psicológicas (PNA)**: El estado del paciente se modela como un sistema dinámico de variables interconectadas (dolor, sueño, hipervigilancia), permitiendo identificar nodos críticos de intervención.
* **Lógica Difusa (Fuzzy Logic)**: Aplicación de **Mapas Cognitivos Difusos (FCM)** para traducir la subjetividad del dolor reportado por el paciente en valores computables de alta precisión.

## 🛠️ Stack Tecnológico
Arquitectura diseñada para la máxima eficiencia y protección del balance alostático del investigador:

* **Entorno**: Node.js v24.14.0 (LTS).
* **Backend**: Express.js + Scripts integrados de **Python** para inferencia bayesiana.
* **IA Generativa**: Integración de **LLM** para la generación semántica del Dashboard de Feedback, traduciendo datos estadísticos en pautas de autonomía para el paciente.
* **Base de Datos**: **MongoDB Atlas** (Cloud) con control de acceso granular (IP Whitelisting) y cifrado TLS/SSL.
* **Comunicaciones**: Twilio for WhatsApp API para la automatización del muestreo EMA.
* **Infraestructura**: AWS ECS sobre EC2 con Nginx como Proxy Inverso.

## 🚀 Características Principales
1.  **Recogida Automatizada**: Minimización de la fatiga del paciente mediante triggers inteligentes de WhatsApp.
2.  **Dashboard de Agencia**: Interfaz visual que fomenta la **autonomía y agencia** del paciente mediante feedback descriptivo asistido por IA.
3.  **Seguridad de Grado Clínico (RGPD)**: Cifrado en tránsito y reposo, gestión de consentimiento informado digital y anonimización de datos sensibles.

## 📋 Requisitos e Instalación
El proyecto garantiza la paridad de entornos entre **Windows 11** (desarrollo) y **Linux/AWS** (producción).

### 1. Gestión del Entorno
* **Windows**: Instalar mediante `nvm-windows`.
    ```powershell
    nvm install 24.14.0
    nvm use 24.14.0
    ```
* **Linux**: Utilizar `nvm` estándar.

### 2. Configuración Operativa
1.  Clonar el repositorio.
2.  Configurar el archivo `.env` siguiendo el `.env.example` (incluyendo `MONGO_URI` y credenciales de `Twilio`).
3.  `npm install` && `npm run dev`.

## 👨‍💻 Investigador
**Jose Maria Herrerías Bongolan**  
