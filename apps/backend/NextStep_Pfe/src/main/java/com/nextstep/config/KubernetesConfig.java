package com.nextstep.config;

import io.fabric8.kubernetes.client.Config;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.fabric8.openshift.client.OpenShiftClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration; //Marque cette classe comme classe de configuration Spring.détectée automatqiuement au démarrage
// ✅ Choisir celui-ci
import io.fabric8.kubernetes.client.ConfigBuilder; //Builder utilisé pour construire un objet Config
import org.springframework.context.annotation.Primary;

@Configuration
@Slf4j

public class KubernetesConfig {

    @Value("${openshift.api-url}")
    private String apiUrl;

    @Value("${openshift.token}")
    private String token;

    @Value("${openshift.ca-base64}")
    private String caBase64; //Récupère le certificat de l'autorité de certification encodé en Base64. pour verifier le cluster

    @Bean //Demande à Spring de créer et gérer cet objet.
    @Primary
    public KubernetesClient kubernetesClient() {
        log.info("[K8S] Connexion vers {}", apiUrl);  // ← ajouter ce log pour confirmer
        Config config = new ConfigBuilder()
                .withMasterUrl(apiUrl)
                .withOauthToken(token)
                .withCaCertData(caBase64)
                .withTrustCerts(false)
                .build();

        return new KubernetesClientBuilder()
                .withConfig(config)
                .build();
    }
    @Bean
    public OpenShiftClient openShiftClient(KubernetesClient client) {
        // adapt() crée un OpenShiftClient depuis le KubernetesClient existant
        return client.adapt(OpenShiftClient.class);
    }
}