import os

def consolidate_backend(source_dir, output_file):
    """
    Scans the source directory for relevant code files and concatenates them 
    into a single output file with clear markers.
    """
    extensions = ('.js', '.json', '.sql', '.env.example')
    exclude_dirs = {'node_modules', '.git', 'uploads', 'artifacts'}
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("================================================================================\n")
        outfile.write("VARUNA NEXUS: CONSOLIDATED BACKEND SOURCE CODE\n")
        outfile.write("================================================================================\n\n")
        
        for root, dirs, files in os.walk(source_dir):
            # Prune directories we don't want to traverse
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file.endswith(extensions):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, source_dir)
                    
                    # Log progress to console
                    print(f"Processing: {rel_path}")
                    
                    outfile.write("\n" + "="*80 + "\n")
                    outfile.write(f"FILE: {rel_path}\n")
                    outfile.write("="*80 + "\n\n")
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                            outfile.write("\n")
                    except Exception as e:
                        outfile.write(f"\n[ERROR READING FILE: {e}]\n")
                    
    print(f"\nDone! All source code saved to: {output_file}")

if __name__ == "__main__":
    project_root = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(project_root, "VARUNA_BACKEND_CONSOLIDATED.txt")
    
    consolidate_backend(project_root, output_path)
