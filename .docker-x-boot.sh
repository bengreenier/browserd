ELECTRON_ENTRY_POINT=$1

if [ -z "$ELECTRON_ENTRY_POINT" ]
  then
    echo "No electron entrypoint supplied"
fi

# Start x
Xorg -nocursor -logverbose 6 -noreset +extension GLX +extension RANDR +extension RENDER -config .docker-display.conf :10 &
export DISPLAY=:10

# Verify x goes up safely
X_WAIT_MAX=40
X_WAIT_COUNT=0
while ! xdpyinfo >/dev/null 2>&1; do
  sleep .3
  X_WAIT_COUNT=$(( X_WAIT_COUNT + 1 ))
    if [ "$X_WAIT_COUNT" -ge "$X_WAIT_MAX" ]; then
      echo "Gave up waiting for X"
      exit 11
    fi
done

# log all x11 stuff using cnee
cnee -perns > /var/log/cnee-error-codes.txt
cnee -pens > /var/log/cnee-event-codes.txt
DISPLAY=:10 cnee -rec --all-events -hp -erra 0-999 -o /var/log/cnee.log -e /var/log/cnee.err -v &

# take all env vars in the session, and save them for su
ELECTRON_ENVS=$(env | grep -vE "^(HOME|PATH)" | tr '\n' ' ')

E_PROC="$ELECTRON_ENVS $ELECTRON_ENTRY_POINT"
E_PWD=$(pwd)

# Run arg0 (passing along env)
su - electron -c "cd $E_PWD && $E_PROC"

# output cnee stuff
cat /var/log/cnee.log