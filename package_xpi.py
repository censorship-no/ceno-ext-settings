import os
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
        sys.exit(1)


if __name__ == "__main__":
    main()
