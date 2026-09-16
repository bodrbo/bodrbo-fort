#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
build_stamp=$(date '+%Y%m%d-%H%M%S')
release_root="$project_root/release"
build_dir="$release_root/bodrbo-fort-$build_stamp"
archive_path="$release_root/bodrbo-fort-beget-$build_stamp.zip"

mkdir -p "$build_dir/assets" "$release_root"
cp "$project_root/index.html" "$project_root/404.html" "$project_root/styles.css" "$project_root/script.js" "$project_root/robots.txt" "$project_root/sitemap.xml" "$project_root/.htaccess" "$build_dir/"
cp "$project_root/assets/logo-face.png" "$build_dir/assets/"
cp -R "$project_root/assets/images" "$build_dir/assets/"

(cd "$build_dir" && zip -q -r "$archive_path" .)
printf '%s\n' "$build_dir"
printf '%s\n' "$archive_path"
