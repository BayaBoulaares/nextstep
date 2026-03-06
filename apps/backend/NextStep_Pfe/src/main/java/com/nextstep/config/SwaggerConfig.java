package com.nextstep.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/*@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "NextStep - Gestion Cloud API",
        version = "1.0",
        description = "API de gestion des services et plans Cloud - PFE"
    )
)
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT",
    description = "Coller votre token JWT Keycloak ici"
)
public class SwaggerConfig {}*/
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "NextStep - Gestion Cloud API",
                version = "1.0",
                description = "API de gestion des services et plans Cloud - PFE"
        )
)
public class SwaggerConfig {}