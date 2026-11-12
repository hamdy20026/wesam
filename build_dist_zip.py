import os
import sys
import shutil
import subprocess
import zipfile

def prepare_dist_and_build_zip(skip_vite=False):
    if not skip_vite:
        print("--- 1. Running Vite build (npx vite build) ---")
        try:
            subprocess.run(['npx', 'vite', 'build'], check=True)
            print("Vite production build completed successfully.")
        except Exception as e:
            print("Error during vite build:", e)
            raise

    # Clean up chat screenshot attachments from dist/assets if Vite copied them from public
    aistudio_in_dist = os.path.join('dist', 'assets', 'aistudio')
    if os.path.exists(aistudio_in_dist):
        shutil.rmtree(aistudio_in_dist)
        print("Cleaned up chat attachments from dist/assets.")

    # Remove any existing zip archives inside dist so we don't zip previous zips
    if os.path.exists('dist'):
        for f in os.listdir('dist'):
            if f.endswith('.zip'):
                os.remove(os.path.join('dist', f))

    # --- 2. Copy PHP API files into dist/api ---
    os.makedirs(os.path.join('dist', 'api'), exist_ok=True)
    if os.path.exists(os.path.join('public', 'api')):
        for file_name in os.listdir(os.path.join('public', 'api')):
            src_f = os.path.join('public', 'api', file_name)
            if os.path.isfile(src_f):
                shutil.copyfile(src_f, os.path.join('dist', 'api', file_name))
    print("PHP API files copied to dist/api.")

    # --- 3. Copy SQL database files into dist root ---
    for f in os.listdir('public'):
        if f.endswith('.sql'):
            shutil.copyfile(os.path.join('public', f), os.path.join('dist', f))
    print("SQL database files copied to dist.")

    # --- 4. Create / Ensure dist/index.php for XAMPP root entry ---
    dist_index_php = os.path.join('dist', 'index.php')
    with open(dist_index_php, 'w', encoding='utf-8') as f:
        f.write("""<?php
// Automatic Root Router for Wessam Electrical ERP in XAMPP / Apache
if (file_exists(__DIR__ . '/index.html')) {
    readfile(__DIR__ . '/index.html');
    exit();
}
?>""")

    # --- 5. Create / Ensure dist/.htaccess for Apache routing ---
    dist_htaccess = os.path.join('dist', '.htaccess')
    with open(dist_htaccess, 'w', encoding='utf-8') as f:
        f.write("""<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase ./
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . index.html [L]
</IfModule>
""")

    # --- 6. Copy deployment scripts, configs, and source files into dist ---
    support_files = [
        'deploy_to_xampp.bat',
        'run_desktop.bat',
        'package.json',
        'server.ts',
        'server.js',
        'vite.config.ts',
        'tsconfig.json',
        'README.md',
        'README_SQLSERVER.md',
        '.env.example'
    ]
    for sf in support_files:
        if os.path.exists(sf):
            shutil.copyfile(sf, os.path.join('dist', sf))

    # Copy src/ and data/ directories into dist
    for d in ['src', 'data']:
        if os.path.exists(d):
            dest_d = os.path.join('dist', d)
            if os.path.exists(dest_d):
                shutil.rmtree(dest_d)
            shutil.copytree(d, dest_d, ignore=shutil.ignore_patterns('*.zip', 'node_modules', '__pycache__'))

    print("Deployment support scripts, configs, and source files copied to dist.")

    # --- 7. Build pristine ZIP package (Single clean root, NO duplicate entries) ---
    zip_filename = 'wessam_electrical_erp_dist.zip'
    
    # Remove old zips from root and public
    for target in ['dist.zip', zip_filename, os.path.join('public', 'dist.zip'), os.path.join('public', zip_filename)]:
        if os.path.exists(target):
            try:
                os.remove(target)
            except Exception:
                pass

    print(f"--- 8. Creating zip archive: {zip_filename} ---")
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('dist'):
            for file in files:
                if file.endswith('.zip'):
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, 'dist')
                zipf.write(file_path, rel_path)

    # Replicate zip to root and public so in-app download buttons work seamlessly
    shutil.copyfile(zip_filename, 'dist.zip')
    
    os.makedirs('public', exist_ok=True)
    shutil.copyfile(zip_filename, os.path.join('public', zip_filename))
    shutil.copyfile(zip_filename, os.path.join('public', 'dist.zip'))

    zip_size_mb = os.path.getsize(zip_filename) / (1024 * 1024)
    print(f"SUCCESS: Complete dist folder & zip package created cleanly! Size: {zip_size_mb:.2f} MB")
    
    # Print root files inside the zip for verification
    with zipfile.ZipFile(zip_filename, 'r') as zf:
        names = zf.namelist()
        root_entries = sorted(set([n.split('/')[0] for n in names]))
        print(f"Total files in dist & archive: {len(names)}")
        print(f"Top-level dist entries: {root_entries}")

if __name__ == '__main__':
    skip = '--skip-vite' in sys.argv
    prepare_dist_and_build_zip(skip_vite=skip)

