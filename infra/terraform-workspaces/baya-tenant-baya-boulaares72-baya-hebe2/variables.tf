# variables.tf
variable "vm_name"        { type = string }
variable "namespace"      { type = string }
variable "instance_type"  { type = string }   # ← remplace cpu_cores + ram_gb
variable "disk_gb"        { type = number }
variable "os_image"       { type = string }
variable "vm_password"    { type = string }
variable "kube_host"      { type = string }
variable "kube_token"     { type = string }
variable "kube_ca"        { type = string }
variable "availability_set"  {
  type    = string
  default = ""          # vide = pas d'anti-affinité
}
