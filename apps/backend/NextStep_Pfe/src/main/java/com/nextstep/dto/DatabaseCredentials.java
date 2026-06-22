package com.nextstep.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DatabaseCredentials {
    private String host;
    private String hostRo;
    private Integer port;
    private String dbName;
    private String username;
    private String password;
    private String jdbcUrl;
}