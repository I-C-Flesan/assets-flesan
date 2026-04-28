import os
import subprocess
import sys

# Configuración
BASE_URL = "https://i-c-flesan.github.io/assets-flesan/"
ASSETS_DIRS = ["banner_areas", "base-html", "icono_f1", "iconos_png", "iconos_svg", "logos"]
README_PATH = "README.md"
ASSETS_SECTION_HEADER = "## Assets disponibles"

def run_command(command, description):
    """Ejecuta un comando de sistema y maneja errores básicos."""
    print(f"--- {description} ---")
    try:
        result = subprocess.run(command, check=True, text=True, capture_output=True, shell=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error al ejecutar: {description}")
        print(e.stderr)
        return False

def get_assets_list():
    """Escanea los directorios de assets y devuelve una lista formateada en Markdown."""
    assets = []
    for directory in ASSETS_DIRS:
        if not os.path.exists(directory):
            continue
        
        # Caminar por el directorio para encontrar archivos
        for root, _, files in os.walk(directory):
            for file in files:
                # Obtener la ruta relativa del archivo
                relative_path = os.path.join(root, file).replace("\\", "/")
                # Generar el enlace de GitHub Pages
                url = f"{BASE_URL}{relative_path}"
                assets.append(f"- [`{relative_path}`]({url})")
    
    # Ordenar alfabéticamente por la ruta
    assets.sort()
    return assets

def update_readme(assets_list):
    """Actualiza el archivo README.md con la nueva lista de assets."""
    if not os.path.exists(README_PATH):
        print(f"Error: No se encontró {README_PATH}")
        return False

    with open(README_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_content = []
    found_header = False
    
    for line in lines:
        new_content.append(line)
        if line.strip() == ASSETS_SECTION_HEADER:
            found_header = True
            break
    
    if not found_header:
        print(f"Error: No se encontró el encabezado '{ASSETS_SECTION_HEADER}' en {README_PATH}")
        # Si no existe, lo agregamos al final
        new_content.append("\n" + ASSETS_SECTION_HEADER + "\n")
    
    # Agregar la lista de assets
    new_content.extend([asset + "\n" for asset in assets_list])
    
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_content)
    
    print(f"README.md actualizado con {len(assets_list)} assets.")
    return True

def main():
    # 1. Pull de cambios
    if not run_command("git pull origin main", "Bajando cambios actualizados (git pull)"):
        print("Advertencia: No se pudo realizar el pull, continuando...")

    # 2. Obtener lista de assets
    assets = get_assets_list()
    if not assets:
        print("No se encontraron assets en los directorios configurados.")
        return

    # 3. Actualizar README.md
    if not update_readme(assets):
        return

    # 4. Git Add
    run_command("git add .", "Agregando cambios al index (git add)")

    # 5. Git Commit
    commit_msg = "docs(readme): update assets list and sync"
    if not run_command(f'git commit -m "{commit_msg}"', "Creando commit"):
        print("No hay cambios para committear.")
    else:
        # 6. Git Push
        run_command("git push origin main", "Subiendo cambios a main (git push)")

if __name__ == "__main__":
    main()
