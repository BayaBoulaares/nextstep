# variables.tf
variable "vm_name"     { type = string }
variable "namespace"   { type = string }
variable "cpu_cores"   { type = number }
variable "ram_gb"      { type = number }
variable "disk_gb"     { type = number }
variable "os_image"    { type = string }
variable "kube_host"   { type = string }
variable "kube_token"  { type = string }
variable "kube_ca"     { type = string }
variable "vm_password" { type = string }  # ✅ nouveau