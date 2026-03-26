def calculate_posterior(metrics) -> float:
    # Lógica de Inferencia Bayesiana Simplificada (Energy Resistance Principle)
    # P(H|E) = (P(E|H) * P(H)) / P(E)
    
    # 1. Likelihood basada en el ERP de McEwen
    likelihood_factor = metrics.tension / metrics.energy
    
    # 2. Actualización de la probabilidad
    posterior = (metrics.previous_probability * likelihood_factor) / 1.5
    
    # 3. Normalización [0, 1]
    return min(max(posterior, 0.0), 1.0)
