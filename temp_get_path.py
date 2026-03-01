import sys
for p in sys.path:
    if "site-packages" in p:
        print(p)
        break
