#
# Code Amalgamator GUI - Fixed Version
#
# Description:
# This script provides a graphical user interface (GUI) to select subdirectories
# and individual files from a unified list and combine them into a single text file.
# Each item's content is separated by a decorative comment block.
#
# How to Use:
# 1. Place this script (`combine.py`) in the root directory of your project.
# 2. Run the script. A window will appear with a list and configuration options.
# 3. Check the "Ignored Directories" list. If your code is in a folder that is
#    listed (e.g., 'dist', 'build'), remove it from the text box.
# 4. Click "Refresh List" to see the updated directories.
# 5. Select items from the list (use Ctrl+Click or Shift+Click).
# 6. Click the "Combine Selected Items..." button.
#

import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import traceback
import threading

# --- Configuration ---

# A dictionary that maps file extensions to their comment styles.
COMMENT_MAP = {
    # Languages with // style comments
    '.js': '//', '.jsx': '//', '.ts': '//', '.tsx': '//', '.java': '//',
    '.c': '//', '.h': '//', '.cpp': '//', '.hpp': '//', '.cs': '//',
    '.go': '//', '.swift': '//', '.kt': '//', '.rs': '//', '.scala': '//',
    '.m': '//', '.mm': '//',

    # Languages with # style comments
    '.py': '#', '.rb': '#', '.sh': '#', '.pl': '#', '.yml': '#',
    '.yaml': '#', '.dockerfile': '#', '.r': '#', '.ps1': '#',
    '.conf': '#', '.ini': '#', '.cfg': '#', '.env': '#',

    # Languages with /* ... */ style block comments
    '.css': ('/*', '*/'), '.scss': ('/*', '*/'), '.less': ('/*', '*/'),

    # Languages with <!-- ... --> style block comments
    '.html': ('<!--', '-->'), '.xml': ('<!--', '-->'), '.vue': ('<!--', '-->'),
    '.svg': ('<!--', '-->'), '.md': ('<!--', '-->'),

    # Other languages
    '.sql': '--',
    '.lua': '--',
    '.bat': 'REM',
    '.json': '//',  # JSON doesn't support comments, but we'll use // for our separators
    '.txt': '#',
}

# File extensions to include (empty list means include all files)
INCLUDE_EXTENSIONS = [
    '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.h', '.cpp', '.hpp',
    '.cs', '.go', '.swift', '.kt', '.rs', '.scala', '.rb', '.sh', '.pl',
    '.yml', '.yaml', '.css', '.scss', '.less', '.html', '.xml', '.vue',
    '.svg', '.md', '.sql', '.lua', '.bat', '.json', '.txt', '.dockerfile',
    '.env', '.conf', '.ini', '.cfg'
]

# Binary file extensions to skip
BINARY_EXTENSIONS = {
    '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
    '.jar', '.war', '.ear', '.class', '.pyc', '.pyo', '.pyd',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.tiff', '.svg',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'
}

# --- Core Logic Functions ---

def is_binary_file(file_path):
    """Check if a file is likely to be binary."""
    _, ext = os.path.splitext(file_path.lower())
    if ext in BINARY_EXTENSIONS:
        return True
    
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(1024)
            if b'\x00' in chunk:  # Null byte indicates binary
                return True
    except Exception:
        return True
    
    return False

def should_include_file(file_path):
    """Check if a file should be included based on extension and other criteria."""
    if not os.path.isfile(file_path):
        return False
    
    # Check if it's a binary file
    if is_binary_file(file_path):
        return False
    
    # If INCLUDE_EXTENSIONS is empty, include all non-binary files
    if not INCLUDE_EXTENSIONS:
        return True
    
    _, ext = os.path.splitext(file_path.lower())
    return ext in INCLUDE_EXTENSIONS

def create_separator(file_path):
    """Creates a formatted separator string for a given file path."""
    _, ext = os.path.splitext(file_path.lower())
    comment_style = COMMENT_MAP.get(ext, '#')  # Default to # if extension not found
    separator_text = f" File: {file_path} "
    line_length = 80

    try:
        if isinstance(comment_style, tuple):
            start, end = comment_style
            padding = start[0] * max(0, line_length - len(separator_text) - len(start) - len(end))
            return f"\n{start}{separator_text}{padding}{end}\n\n"
        elif isinstance(comment_style, str):
            border = comment_style * line_length
            centered_text = f"{comment_style} {separator_text} {comment_style}"
            return f"\n{border}\n{centered_text}\n{border}\n\n"
        else:
            border = "=" * line_length
            return f"\n{border}\n=== {file_path.center(line_length - 8)} ===\n{border}\n\n"
    except Exception:
        # Fallback separator
        border = "=" * line_length
        return f"\n{border}\n=== {file_path} ===\n{border}\n\n"

def get_subdirectories(path, ignore_dirs):
    """Finds all immediate subdirectories in the given path, excluding ignored ones."""
    dirs = []
    try:
        for item in os.listdir(path):
            item_path = os.path.join(path, item)
            if os.path.isdir(item_path) and item not in ignore_dirs and not item.startswith('.'):
                dirs.append(item)
    except PermissionError:
        pass  # Skip directories we can't access
    except Exception as e:
        print(f"Error getting subdirectories: {e}")
    
    return sorted(dirs)

def get_root_files(path):
    """Finds all files in the root path, excluding this script and other common files."""
    files = []
    script_name = os.path.basename(__file__)
    ignore_files = {script_name, '.DS_Store', 'Thumbs.db', 'desktop.ini'}
    
    try:
        for item in os.listdir(path):
            item_path = os.path.join(path, item)
            if (os.path.isfile(item_path) and 
                item not in ignore_files and 
                not item.startswith('.') and 
                should_include_file(item_path)):
                files.append(item)
    except PermissionError:
        pass  # Skip files we can't access
    except Exception as e:
        print(f"Error getting root files: {e}")
    
    return sorted(files)

def read_file_safely(file_path):
    """Safely read a file with multiple encoding attempts."""
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
                return content, encoding
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"Error reading {file_path} with {encoding}: {e}")
            continue
    
    # If all encodings fail, try reading as binary and decode with errors='replace'
    try:
        with open(file_path, 'rb') as f:
            content = f.read().decode('utf-8', errors='replace')
            return content, 'utf-8 (with errors)'
    except Exception as e:
        print(f"Failed to read {file_path}: {e}")
        return f"[ERROR: Could not read file {file_path}: {str(e)}]\n", 'error'

# --- GUI Application Class ---

class CodeAmalgamatorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Code Amalgamator - Fixed Version")
        self.root.geometry("600x700")
        self.root.minsize(500, 500)
        
        self.setup_styles()
        self.create_widgets()
        self.populate_list()

    def setup_styles(self):
        """Configures the ttk styles for the application."""
        self.style = ttk.Style(self.root)
        try:
            self.style.theme_use('clam')
        except:
            pass  # Use default theme if clam is not available
        
        self.style.configure("TLabel", padding=5, font=('Helvetica', 10))
        self.style.configure("TButton", padding=8, font=('Helvetica', 10, 'bold'))
        self.style.configure("TFrame", padding=10)
        self.style.configure("TLabelframe.Label", font=('Helvetica', 11, 'bold'))

    def create_widgets(self):
        """Creates and arranges all the GUI elements in the window."""
        main_frame = ttk.Frame(self.root, padding="15 15 15 15")
        main_frame.pack(expand=True, fill=tk.BOTH)

        # --- Configuration Frame ---
        config_frame = ttk.LabelFrame(main_frame, text="Configuration")
        config_frame.pack(fill=tk.X, pady=(0, 10))
        
        ignore_label = ttk.Label(config_frame, text="Ignored Directories (comma-separated):")
        ignore_label.pack(anchor=tk.W, padx=5, pady=(5,0))

        default_ignores = ".git, .vscode, __pycache__, node_modules, .idea, venv, .pytest_cache, dist, build, .next, coverage, .nyc_output"
        self.ignore_dirs_var = tk.StringVar(value=default_ignores)
        ignore_entry = ttk.Entry(config_frame, textvariable=self.ignore_dirs_var, font=('Courier', 9))
        ignore_entry.pack(fill=tk.X, padx=5, pady=5, ipady=3)

        # Add file extension filter
        ext_label = ttk.Label(config_frame, text="Include only these extensions (leave empty for all):")
        ext_label.pack(anchor=tk.W, padx=5, pady=(10,0))
        
        default_extensions = ", ".join(INCLUDE_EXTENSIONS)
        self.extensions_var = tk.StringVar(value=default_extensions)
        ext_entry = ttk.Entry(config_frame, textvariable=self.extensions_var, font=('Courier', 9))
        ext_entry.pack(fill=tk.X, padx=5, pady=5, ipady=3)

        refresh_button = ttk.Button(config_frame, text="Refresh List", command=self.populate_list)
        refresh_button.pack(fill=tk.X, padx=5, pady=(10, 5))

        # --- Unified Selection Frame ---
        selection_frame = ttk.LabelFrame(main_frame, text="Select Items to Combine")
        selection_frame.pack(expand=True, fill=tk.BOTH, pady=(0, 10))
        
        # Add select/deselect all buttons
        button_frame = ttk.Frame(selection_frame)
        button_frame.pack(fill=tk.X, padx=10, pady=(5, 0))
        
        select_all_btn = ttk.Button(button_frame, text="Select All", command=self.select_all)
        select_all_btn.pack(side=tk.LEFT, padx=(0, 5))
        
        deselect_all_btn = ttk.Button(button_frame, text="Deselect All", command=self.deselect_all)
        deselect_all_btn.pack(side=tk.LEFT)
        
        self.item_listbox = self.create_listbox_with_scrollbar(selection_frame)

        # --- Control Frame ---
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill=tk.X)
        self.combine_button = ttk.Button(control_frame, text="Combine Selected Items...", command=self.run_combination_threaded)
        self.combine_button.pack(expand=True, fill=tk.X)

        # --- Progress Bar ---
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.pack(fill=tk.X, pady=(10, 0))

        # --- Status Bar ---
        self.status_var = tk.StringVar(value="Ready")
        status_bar = ttk.Label(self.root, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W, padding=5)
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def create_listbox_with_scrollbar(self, parent_frame):
        """Helper to create a listbox and its associated scrollbar."""
        listbox_frame = ttk.Frame(parent_frame)
        listbox_frame.pack(expand=True, fill=tk.BOTH, padx=10, pady=10)
        
        listbox = tk.Listbox(listbox_frame, selectmode=tk.EXTENDED, font=('Courier', 10), relief=tk.FLAT)
        listbox.pack(side=tk.LEFT, expand=True, fill=tk.BOTH)

        scrollbar = ttk.Scrollbar(listbox_frame, orient=tk.VERTICAL, command=listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        listbox.config(yscrollcommand=scrollbar.set)
        return listbox

    def select_all(self):
        """Select all items in the listbox."""
        self.item_listbox.select_set(0, tk.END)

    def deselect_all(self):
        """Deselect all items in the listbox."""
        self.item_listbox.selection_clear(0, tk.END)

    def get_ignore_set(self):
        """Reads the ignore entry and returns a set of directory names."""
        return {d.strip() for d in self.ignore_dirs_var.get().split(',') if d.strip()}

    def get_extension_set(self):
        """Reads the extension entry and returns a set of extensions."""
        extensions = {ext.strip().lower() for ext in self.extensions_var.get().split(',') if ext.strip()}
        # Ensure extensions start with a dot
        return {ext if ext.startswith('.') else f'.{ext}' for ext in extensions}

    def populate_list(self):
        """Scans for and lists the directories and files in the unified listbox."""
        self.item_listbox.config(state=tk.NORMAL)
        self.item_listbox.delete(0, tk.END)
        
        try:
            ignore_set = self.get_ignore_set()
            
            # Update global INCLUDE_EXTENSIONS if specified
            extension_set = self.get_extension_set()
            if extension_set:
                global INCLUDE_EXTENSIONS
                INCLUDE_EXTENSIONS = list(extension_set)
            
            subdirs = get_subdirectories('.', ignore_set)
            files = get_root_files('.')

            if not subdirs and not files:
                self.item_listbox.insert(tk.END, " No items found.")
                self.item_listbox.config(state=tk.DISABLED)
                self.status_var.set("No items found")
                return

            # Add directories
            for dirname in subdirs:
                self.item_listbox.insert(tk.END, f" [DIR] {dirname}")
            
            # Add files
            for filename in files:
                self.item_listbox.insert(tk.END, f" [FILE] {filename}")
            
            self.status_var.set(f"Found {len(subdirs)} directories and {len(files)} files")

        except Exception as e:
            error_msg = f"Error populating list: {str(e)}"
            self.status_var.set(error_msg)
            self.item_listbox.insert(tk.END, f" Error: {error_msg}")
            print(f"Error in populate_list: {traceback.format_exc()}")

    def run_combination_threaded(self):
        """Run the combination process in a separate thread."""
        thread = threading.Thread(target=self.run_combination)
        thread.daemon = True
        thread.start()

    def run_combination(self):
        """Handles the file combination logic when the button is pressed."""
        try:
            # Disable button and start progress
            self.root.after(0, lambda: self.combine_button.config(state='disabled'))
            self.root.after(0, lambda: self.progress.start())
            
            selected_indices = self.item_listbox.curselection()

            if not selected_indices:
                self.root.after(0, lambda: messagebox.showwarning("No Selection", "Please select at least one item from the list."))
                return

            selected_items = [self.item_listbox.get(i) for i in selected_indices]
            ignore_set = self.get_ignore_set()

            # Ask for output file in the main thread
            output_filepath = None
            def ask_save():
                nonlocal output_filepath
                output_filepath = filedialog.asksaveasfilename(
                    title="Save Combined File As...",
                    defaultextension=".txt",
                    filetypes=[("Text Documents", "*.txt"), ("All Files", "*.*")]
                )

            self.root.after(0, ask_save)
            
            # Wait for user input (simplified approach)
            import time
            while output_filepath is None:
                time.sleep(0.1)
                self.root.update()

            if not output_filepath:
                self.root.after(0, lambda: self.status_var.set("Save cancelled."))
                return

            self.root.after(0, lambda: self.status_var.set("Processing... Please wait."))

            total_files_processed = 0
            total_errors = 0
            error_log = []

            with open(output_filepath, 'w', encoding='utf-8') as outfile:
                # Write header
                outfile.write("="*80 + "\n")
                outfile.write("CODE AMALGAMATOR - COMBINED FILES\n")
                outfile.write(f"Generated: {os.path.basename(output_filepath)}\n")
                outfile.write("="*80 + "\n\n")

                for item in selected_items:
                    if item.startswith(" [DIR] "):
                        dirname = item[7:]  # Remove " [DIR] " prefix
                        self.root.after(0, lambda d=dirname: self.status_var.set(f"Processing directory: {d}"))
                        
                        for root, dirs, files in os.walk(dirname):
                            # Prune the walk by removing ignored directories
                            dirs[:] = [d for d in dirs if d not in ignore_set and not d.startswith('.')]
                            
                            for filename in files:
                                file_path = os.path.join(root, filename)
                                
                                if not should_include_file(file_path):
                                    continue
                                
                                try:
                                    relative_path = os.path.relpath(file_path, start=os.getcwd())
                                    outfile.write(create_separator(relative_path))
                                    
                                    content, encoding = read_file_safely(file_path)
                                    outfile.write(content)
                                    outfile.write('\n\n')
                                    
                                    total_files_processed += 1
                                    
                                except Exception as e:
                                    error_msg = f"Error processing {file_path}: {str(e)}"
                                    error_log.append(error_msg)
                                    total_errors += 1
                                    outfile.write(f"[ERROR: {error_msg}]\n\n")
                    
                    elif item.startswith(" [FILE] "):
                        filename = item[8:]  # Remove " [FILE] " prefix
                        self.root.after(0, lambda f=filename: self.status_var.set(f"Processing file: {f}"))
                        
                        try:
                            if should_include_file(filename):
                                outfile.write(create_separator(filename))
                                content, encoding = read_file_safely(filename)
                                outfile.write(content)
                                outfile.write('\n\n')
                                total_files_processed += 1
                        except Exception as e:
                            error_msg = f"Error processing {filename}: {str(e)}"
                            error_log.append(error_msg)
                            total_errors += 1
                            outfile.write(f"[ERROR: {error_msg}]\n\n")

            # Show results
            if total_files_processed > 0:
                success_msg = f"Successfully combined {total_files_processed} files"
                if total_errors > 0:
                    success_msg += f" ({total_errors} errors)"
                success_msg += f" into:\n{os.path.basename(output_filepath)}"
                
                if error_log:
                    success_msg += "\n\nErrors encountered:\n" + "\n".join(error_log[:5])
                    if len(error_log) > 5:
                        success_msg += f"\n... and {len(error_log) - 5} more errors."

                self.root.after(0, lambda: self.status_var.set(f"Success! Combined {total_files_processed} files."))
                self.root.after(0, lambda: messagebox.showinfo("Success", success_msg))
            else:
                try:
                    os.remove(output_filepath)
                except OSError as e:
                    print(f"Could not remove empty output file: {e}")

                self.root.after(0, lambda: self.status_var.set("Completed. No files were found."))
                self.root.after(0, lambda: messagebox.showwarning(
                    "No Files Found",
                    "The combination process finished, but no readable files were found in your selection.\n\n"
                    "Please check that the directories are not empty and contain supported file types."
                ))

        except Exception as e:
            error_message = f"An error occurred: {str(e)}\n\nFull traceback:\n{traceback.format_exc()}"
            self.root.after(0, lambda: self.status_var.set("Error!"))
            self.root.after(0, lambda: messagebox.showerror("Error", error_message))
            print(f"Error in run_combination: {traceback.format_exc()}")

        finally:
            # Re-enable button and stop progress
            self.root.after(0, lambda: self.combine_button.config(state='normal'))
            self.root.after(0, lambda: self.progress.stop())

if __name__ == "__main__":
    try:
        app_root = tk.Tk()
        app = CodeAmalgamatorApp(app_root)
        app_root.mainloop()
    except Exception as e:
        print(f"Failed to start application: {e}")
        print(traceback.format_exc())
