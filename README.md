# SARA (Sistema de Acompañamiento y Resiliencia Alostática)

## TFM-MVP: Predicción de Burnout mediante Modelado de Carga Alostática e IA
**Enfoque: Evaluación Ecológica Momentaria (EMA) de Ultra-Baja Fricción**

SARA es un Producto Mínimo Viable (MVP) desarrollado para el **Trabajo Fin de Máster (UNIR)** y proyectado como base tecnológica para un **Doctorado Industrial (2027)**. El sistema evoluciona de la monitorización reactiva a la analítica predictiva del **agotamiento**, actuando como un "seguro de continuidad" en entornos de alta demanda de cuidados y dolor crónico.

## 🧠 Marco de Investigación (ERP & Digital Twin 2026)
SARA se fundamenta en el **Energy Resistance Principle (ERP)**: el colapso ocurre cuando el gasto energético en gestionar el estrés (carga alostática) compite con los procesos de reparación biológica.

* **Gemelo Digital (CDT)**: Modelado de la trayectoria de fatiga para simular puntos de ruptura.
* **Inferencia Bayesiana**: Uso de algoritmos para actualizar la probabilidad de burnout en tiempo real $$P(H|E)$$.
* **JITAI (Just-In-Time Adaptive Interventions)**: Micro-intervenciones de apoyo en momentos de alta receptividad.

## 🛠️ Stack Tecnológico: Arquitectura "Conversational Hub"
Diseñada para la **invisibilidad operativa** y la **máxima adherencia**, eliminando la fricción de instalación de aplicaciones nativas:

* **Canal de Interacción**: **WhatsApp Business API (Twilio)** para notificaciones y triggers.
* **Frontend de Captura**: Micro-formularios web (20 seg) servidos con **Node.js + EJS**.
* **Backend**: **Node.js v24 LTS** + Express.js.
* **Motor Predictivo**: Scripts de **Python** para procesado de modelos estadísticos.
* **Base de Datos**: **MongoDB Atlas** (Almacenamiento de fenotipos digitales).
* **Infraestructura**: AWS (Cumplimiento de RGPD y seguridad de datos de salud).

## 🚀 Protocolo de Captura de "Fricción Cero" (20-Second Rule)
Para preservar los recursos cognitivos del usuario, SARA opera bajo un modelo de **interacción asíncrona**:

1.  **Trigger Inteligente (Node-Cron)**: El sistema decide el momento óptimo de evaluación según el perfil del usuario.
2.  **Notificación Outbound**: Envío de link personalizado vía WhatsApp. Sin logins, sin contraseñas (Tokens efímeros).
3.  **Validación Activa (20s)**:
    * **Micro-Escalas**: Una sola pregunta de impacto (0-10) sobre energía/dolor/estrés.
    * **Filtro de Ruido**: Validación subjetiva para calibrar el modelo predictivo.
4.  **Bucle de Refuerzo (Incentivo Inmediato)**: Tras el envío, SARA devuelve automáticamente:
    * **Feedback Visual**: Gráfica de tendencia de resiliencia semanal.
    * **EMI (Intervención)**: Un "Micro-Tip" de salud o técnica de regulación vagal basada en la respuesta actual.



## 🎯 Estrategia de Muestreo y Ética
* **Cribado Automatizado**: Filtro inicial de participantes mediante criterios de inclusión clínicos y tecnológicos.
* **Protección de Datos**: Anonimización de registros en MongoDB y cifrado de extremo a extremo en las comunicaciones de captación.
* **Hito Académico**: El sistema permite recolectar un N de alta calidad con un *attrition rate* mínimo, facilitando la defensa de la validez externa en el TFM.

## 👨‍💻 Investigador
**Jose María Herrerías** *Psicólogo General Sanitario & Principal Software Architect*

 