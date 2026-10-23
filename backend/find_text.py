import sys
from evaluate_parser import read_file, RESUMES

if len(sys.argv) < 3:
    print('Usage: python find_text.py resume01 "word"')
    sys.exit()

name, word = sys.argv[1], sys.argv[2].lower()
files = list(RESUMES.glob(name + ".*"))
if not files:
    print("No resume file found for", name)
    sys.exit()

text = read_file(files[0])
start, shown = 0, 0
lower = text.lower()
while shown < 3:
    i = lower.find(word, start)
    if i == -1:
        break
    print("...", text[max(0, i - 80): i + 80].replace("\n", " "), "...\n")
    start, shown = i + 1, shown + 1
if shown == 0:
    print("NOT FOUND in the extracted text")