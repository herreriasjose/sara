# SARA (Sistema de Acompañamiento y Resiliencia Alostática)

## TFM-MVP: Predicción de Burnout en Cuidadores Familiares mediante Modelado de Carga Alostática e IA

SARA es un Producto Mínimo Viable (MVP) desarrollado para el **Trabajo Fin de Máster (UNIR)** y proyectado como base tecnológica para un **Doctorado Industrial (2027)**. El sistema evoluciona de la monitorización reactiva a la analítica predictiva del **agotamiento del cuidador**, actuando como un "seguro de continuidad" en el ecosistema de la *Silver Economy*.

## 🧠 Marco de Investigación (ERP & Digital Twin 2026)
SARA se fundamenta en el **Energy Resistance Principle (ERP)**, que postula que el colapso sistémico ocurre cuando el gasto energético en gestionar el estrés (carga alostática) compite con los procesos de reparación biológica.

* **Gemelo Digital del Cuidador (CDT)**: Modelado de la trayectoria de fatiga del usuario para simular puntos de ruptura antes de que ocurra un colapso en el cuidado.
* **Inferencia Bayesiana en Salud Digital**: Uso de algoritmos para actualizar la probabilidad de burnout en tiempo real. El modelo calcula la probabilidad posterior $$P(H|E)$$ integrando el conocimiento clínico previo con las evidencias de los sensores.
* **JITAI (Just-In-Time Adaptive Interventions)**: Entrega de micro-intervenciones de apoyo en los momentos de mayor receptividad detectada por sensores.

## 🛠️ Stack Tecnológico: Arquitectura "Silent PWA"
Diseñada para la invisibilidad operativa y la persistencia de datos en iOS y Android:

* **Frontend**: **Silent PWA** con registro de *Service Workers* y *Push API* para evitar el bloqueo de procesos en segundo plano.
* **Backend**: Node.js v24.14.0 (LTS) + Express.js.
* **Motor Predictivo**: Scripts de **Python** para procesado de modelos de Carga Alostática.
* **Base de Datos**: **MongoDB Atlas** para el almacenamiento de fenotipos digitales dinámicos.
* **Infraestructura**: AWS ECS (Cumplimiento de Esquema Nacional de Seguridad - ENS).

## 🚀 Protocolo de Captura Híbrida 90/10
Para maximizar la adherencia y minimizar la fatiga cognitiva del cuidador (preservando sus recursos para el cuidado activo), SARA opera bajo un modelo de **intrusión mínima selectiva**:

1.  **90% del tiempo: Captura Pasiva ("El Fantasma")**: SARA opera de forma invisible en el sistema.
    * **Índice de Fragmentación del Reposo**: Registro de *screen-time* nocturno y actividad post-sunset para identificar la interrupción del ciclo de reparación vagal.
    * **Firma de Agitación**: Monitorización vía acelerómetro para detectar patrones de estrés psicomotor o inmovilidad por agotamiento.
2.  **10% del tiempo: Validación Activa ("El Permiso")**: SARA solicita validación subjetiva para calibrar el modelo.
    * **Notificaciones Push Condicionales**: Solo se disparan si los sensores detectan un riesgo inminente de claudicación (JITAI).
    * **Restricción de Frecuencia**: Máximo **2 veces al día** para evitar la fatiga por encuestas.
    * **MiSBIE Brief-6**: Micro-encuesta de 20 segundos sobre claridad mental y tensión para triangular las señales de los sensores.
3.  **Incentivo de Apoyo**: Tras completar la validación, el sistema devuelve automáticamente una pieza de feedback visual o una **micro-sesión de *tafakkur*** si el riesgo de burnout es elevado, transformando la tarea de recolección en un recurso de apoyo inmediato.

> **Nota de Estrategia Académica**: En la memoria del TFM, se defenderá que esta "intrusión controlada" es indispensable para evitar el sesgo tecnológico. Garantiza que el **Gemelo Digital (CDT)** sea una representación fiel de la vivencia del cuidador y no solo una colección de métricas de hardware.

## 👨‍💻 Investigador
**Jose María Herrerías** 

---

 