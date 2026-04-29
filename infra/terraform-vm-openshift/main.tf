terraform {
  required_providers {
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
  }
}

provider "kubectl" {
  config_path    = "~/.kube/config"
  config_context = var.kube_context
}

resource "kubectl_manifest" "fedora_vm" {
  yaml_body = file("${path.module}/fedora-vm.yaml")
}