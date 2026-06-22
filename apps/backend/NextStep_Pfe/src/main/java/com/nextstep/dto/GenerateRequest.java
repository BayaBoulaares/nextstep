package com.nextstep.dto;

public class GenerateRequest {
    private String description;
    private String outputType = "yaml_openshift";
    private String namespace = "default";

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getOutputType() { return outputType; }
    public void setOutputType(String outputType) { this.outputType = outputType; }
    public String getNamespace() { return namespace; }
    public void setNamespace(String namespace) { this.namespace = namespace; }
}