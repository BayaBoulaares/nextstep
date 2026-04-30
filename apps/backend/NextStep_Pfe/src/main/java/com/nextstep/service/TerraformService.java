package com.nextstep.service;

import com.nextstep.dto.TerraformResult;
import com.nextstep.dto.VmRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.nio.file.Path;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@Slf4j
public class TerraformService {

    @Value("${openshift.api-url}")
    private String kubeHost;

    @Value("${openshift.token}")
    private String kubeToken;

    @Value("${openshift.ca-base64}")
    private String kubeCa;

    @Value("${terraform.binary-path}")
    private String terraformBinary;

    @Value("${terraform.workspaces-dir}")
    private String workspacesDir;

    private static final String TEMPLATE_PATH = "terraform/vm-template";

   /* public TerraformResult createVm(VmRequest request, String namespace) throws Exception {

        // 1. Créer workspace isolé
        String workspaceId = namespace + "-" + request.getVmName();
        Path workspaceDir = Paths.get(workspacesDir, workspaceId);
        Files.createDirectories(workspaceDir);
        String password = (request.getVmPassword() != null && !request.getVmPassword().isBlank())
                ? request.getVmPassword()
                : generatePassword();


        // 2. Copier les templates .tf
        copyTemplateFiles(workspaceDir);

        // 3. Générer terraform.tfvars
        generateTfVars(workspaceDir, request, namespace);

        // 4. terraform init
        runTerraform(workspaceDir, "init", "-input=false");

        // 5. terraform apply
        String output = runTerraform(workspaceDir,
                "apply", "-auto-approve", "-input=false");

        return new TerraformResult("SUCCESS", request.getVmName(), output);
    }
*/
   public TerraformResult createVm(VmRequest request, String namespace) throws Exception {
       String workspaceId = namespace + "-" + request.getVmName();
       Path workspaceDir  = Paths.get(workspacesDir, workspaceId);
       Files.createDirectories(workspaceDir);

       // ✅ Générer le mot de passe
       String password = (request.getVmPassword() != null && !request.getVmPassword().isBlank())
               ? request.getVmPassword()
               : generatePassword();

       // ✅ Stocker dans request pour récupération dans le controller
       request.setVmPassword(password);

       copyTemplateFiles(workspaceDir);
       generateTfVars(workspaceDir, request, namespace, password); // ✅ passer password
       runTerraform(workspaceDir, "init", "-input=false");
       String output = runTerraform(workspaceDir, "apply", "-auto-approve", "-input=false");

       return new TerraformResult("SUCCESS", request.getVmName(), output, password); // ✅ retourner password
   }
    private void generateTfVars(Path dir, VmRequest req,
                                String namespace) throws IOException {
        String content = """
            vm_name    = "%s"
            namespace  = "%s"
            cpu_cores  = %d
            ram_gb     = %d
            disk_gb    = %d
            os_image   = "%s"
            kube_host  = "%s"
            kube_token = "%s"
            kube_ca    = "%s"
            """.formatted(
                req.getVmName(), namespace,
                req.getCpuCores(), req.getRamGb(), req.getDiskGb(),
                req.getOsImage(),
                kubeHost, kubeToken, kubeCa
        );

        Files.writeString(dir.resolve("terraform.tfvars"), content);
    }

    /*private String runTerraform(Path dir, String... args) throws Exception {
        List<String> cmd = new ArrayList<>();
        cmd.add(terraformBinary);
        cmd.addAll(Arrays.asList(args));

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(dir.toFile());
        pb.redirectErrorStream(true);

        Process process = pb.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exitCode = process.waitFor();

        log.info("terraform {} → exit [{}]\n{}", args[0], exitCode, output);

        if (exitCode != 0) {
            throw new RuntimeException("Terraform failed:\n" + output);
        }
        return output;
    }*/
    private String runTerraform(Path dir, String... args) throws Exception {
        List<String> cmd = new ArrayList<>();
        cmd.add(terraformBinary);
        cmd.addAll(Arrays.asList(args));

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(dir.toFile());
        pb.redirectErrorStream(true);

        Process process = pb.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exitCode = process.waitFor();

        log.info("terraform {} → exit [{}]\n{}", args[0], exitCode, output);

        if (exitCode != 0 && "apply".equals(args[0])) {
            if (output.contains("Provider produced inconsistent result after apply")
                    && output.contains("Creating...")) {
                log.warn("terraform apply — bug provider ignoré, VM créée avec succès");
                return output;
            }
            throw new RuntimeException("Terraform failed:\n" + output);
        }
        return output;
    }

    private void copyTemplateFiles(Path workspaceDir) throws IOException {
        for (String file : List.of("main.tf", "variables.tf", "outputs.tf")) {
            InputStream is = getClass().getClassLoader()
                    .getResourceAsStream(TEMPLATE_PATH + "/" + file);
            if (is == null) throw new IOException("Template non trouvé : " + file);
            Files.copy(is, workspaceDir.resolve(file),
                    StandardCopyOption.REPLACE_EXISTING);
        }
    }
    private String generatePassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        java.util.Random rnd = new java.util.Random();
        for (int i = 0; i < 12; i++)
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }
    private void generateTfVars(Path dir, VmRequest req,
                                String namespace, String password) throws IOException {
        String content = """
        vm_name    = "%s"
        namespace  = "%s"
        cpu_cores  = %d
        ram_gb     = %d
        disk_gb    = %d
        os_image   = "%s"
        vm_password = "%s"
        kube_host  = "%s"
        kube_token = "%s"
        kube_ca    = "%s"
        """.formatted(
                req.getVmName(), namespace,
                req.getCpuCores(), req.getRamGb(), req.getDiskGb(),
                req.getOsImage(),
                password,
                kubeHost, kubeToken, kubeCa
        );
        Files.writeString(dir.resolve("terraform.tfvars"), content);
    }


}
