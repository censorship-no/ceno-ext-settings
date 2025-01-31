import os
import shutil
import sys
import zipfile


def package_xpi(output_path):
    """Create an .xpi file by compressing all files in the current directory."""
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as xpi:
        for root, dirs, files in os.walk("."):
            for file in files:
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, ".")
                xpi.write(full_path, arcname=relative_path)
        print("Files compressed into `xpi`")


def delete_source_files(output_path):
    # Cleanup all files and directories except the created .xpi
    for item in os.listdir("."):
        if item.endswith(".xpi"):
            continue  # Skip the XPI file
        path = os.path.join(".", item)
        try:
            if os.path.isfile(path) or os.path.islink(path):
                os.unlink(path)
            elif os.path.isdir(path):
                shutil.rmtree(path)
        except Exception as e:
            print(f"Error deleting {path}: {e}")


def main():
    # Check if the output path is provided
    if len(sys.argv) != 2:
        print("Usage: package_xpi.py <output_path>")
        sys.exit(1)

    output_path = sys.argv[1]

    print(f"Creating XPI at {output_path}...")
    try:
        package_xpi(output_path)
        print(f"XPI created at {output_path}.")
    except Exception as e:
        print(f"Error creating XPI: {e}")
    try:
        delete_source_files(output_path)
        print("XPI files deleted after compression.")
    except Exception as exc:
        print(f"Error deleting: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
