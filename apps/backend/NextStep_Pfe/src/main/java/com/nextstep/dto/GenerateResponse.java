package com.nextstep.dto;

public class GenerateResponse {
    private String content;
    private String outputType;
    private String explanation;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getOutputType() { return outputType; }
    public void setOutputType(String outputType) { this.outputType = outputType; }
    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
}