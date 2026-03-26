# SARA: Sistema de Acompañamiento y Resiliencia Alostática
### Infraestructura de Predicción de Burnout mediante Micro-Validación y Computación Bayesiana

SARA es una arquitectura de **Evaluación Ecológica Momentaria (EMA)** de alto rendimiento diseñada para la detección precoz de la claudicación del cuidador familiar. El sistema opera bajo un paradigma de **analítica predictiva**, identificando la degradación de la resiliencia antes de que se produzca un fallo sistémico en el entorno de cuidados.

## 🧠 Marco Científico: El Modelo de Carga Alostática
SARA operacionaliza la monitorización del estrés basándose en la **Teoría de la Carga Alostática (Bruce McEwen)**, sustituyendo los cuestionarios retrospectivos por datos en tiempo real con alta validez ecológica.

* **Energy Resistance Principle (ERP):** Modelado dinámico que entiende el agotamiento como un déficit energético. El sistema detecta cuando la *Tensión* acumulada supera sistemáticamente la capacidad de *Recuperación* del organismo.
* **Actualización Bayesiana:** El motor matemático calcula la probabilidad de burnout en tiempo real mediante la integración de evidencias diarias y conocimiento clínico previo.
* **Intervenciones JITAI:** Sincronización de micro-apoyos y recursos de regulación justo en el momento (Just-In-Time) de mayor vulnerabilidad detectada.

## 🛠️ Arquitectura del Sistema (Dual-Stack)
La infraestructura está diseñada para garantizar la máxima resiliencia y el mínimo mantenimiento, operando de forma desacoplada mediante el gestor de procesos **PM2**.

### 1. SARA-Gateway (Node.js v24 LTS)
Encargado de la infraestructura de comunicaciones y persistencia.
* **Conversational Hub:** Orquestación de notificaciones a través de la API de WhatsApp.
* **Privacy-First Frontend:** Renderizado de micro-formularios **EJS** optimizados para la "Regla de los 20 segundos".
* **Persistencia:** Gestión de trayectorias y sistemas de adherencia (Streaks) en **MongoDB Atlas**.

### 2. SARA-Brain (FastAPI / Python 3.13)
Encargado de los cálculos.
* **Cómputo Probabilístico:** Implementación de modelos estadísticos avanzados con **SciPy**.
* **Contrato de Datos:** Validación estricta mediante modelos **Pydantic** para asegurar la integridad de las variables clínicas.
* **Motor Analítico:** Generación de métricas sobre la trayectoria de fatiga y carga alostática acumulada.

## 🔒 Protocolo de Privacidad y Soberanía del Dato
SARA implementa una arquitectura de **"Caja Negra"** para proteger la sensibilidad de los datos de salud frente a plataformas de terceros:
1.  **Canal de Notificación (WhatsApp):** Utilizado exclusivamente para el envío de links efímeros tokenizados. Meta no tiene visibilidad sobre el estado emocional del usuario.
2.  **Túnel de Captura (EJS/HTTPS):** Las respuestas a las micro-validaciones viajan por un túnel cifrado propietario directamente a la base de datos de investigación.
3.  **Anonimización:** Uso de tokens HMAC para desacoplar la identidad del usuario de sus registros de salud en tránsito.

## 🚀 Estado del Proyecto y Validación
El sistema se encuentra en fase de validación técnica, priorizando la estabilidad del puente entre los servicios de Node.js y Python.
* **Objetivo:** Alcanzar una adherencia superior al 80% en estudios longitudinales gracias a la eliminación de fricción en la captura de datos.