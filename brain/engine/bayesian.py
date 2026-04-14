from schemas import EmaInferencePayload

def update_allostatic_state(payload: EmaInferencePayload) -> tuple[float, float, float]:
    state = payload.bayesian_state
    
    # Bypass bayesiano si la métrica carece de calidad (posible automatismo)
    if not payload.latencies.is_high_quality:
        return state.alpha, state.beta, state.prior_probability

    # Delta Alpha: Acumulación de Reserva Energética
    delta_alpha = (payload.energy / 5.0) + (payload.clarity / 3.0)

    # Delta Beta: Acumulación de Desgaste y Fricción Cognitiva
    # Se penaliza asumiendo fatiga ejecutiva si la Latencia de Atención > 10 minutos (600000 ms)
    latency_penalty = 0.5 if payload.latencies.attention_ms > 600000 else 0.0
    delta_beta = (payload.tension / 3.0) + ((4.0 - payload.clarity) / 3.0) + latency_penalty

    new_alpha = state.alpha + delta_alpha
    new_beta = state.beta + delta_beta

    # Inferencia de Probabilidad Posterior mediante la media de la Distribución Beta
    posterior = new_beta / (new_alpha + new_beta)

    return round(new_alpha, 4), round(new_beta, 4), round(posterior, 4)