#### Taken from Apache Maven2 Ubuntu Start Up Batch script

# OS specific support.  $var _must_ be set to either true or false.
cygwin=false;
darwin=false;
mingw=false
case "`uname`" in
  CYGWIN*) cygwin=true ;;
  MINGW*) mingw=true;;
  Darwin*) darwin=true
           if [ -z "$JAVA_VERSION" ] ; then
             JAVA_VERSION="CurrentJDK"
           fi
           if [ -z "$JAVA_HOME" ] ; then
             JAVA_HOME=/System/Library/Frameworks/JavaVM.framework/Versions/${JAVA_VERSION}/Home
           fi
           ;;
esac

if [ -z "$JAVA_HOME" ] ; then
  if [ -r /etc/gentoo-release ] ; then
    JAVA_HOME=`java-config --jre-home`
  fi
fi


# For Cygwin, ensure paths are in UNIX format before anything is touched
if $cygwin ; then
  [ -n "$JAVA_HOME" ] &&
    JAVA_HOME=`cygpath --unix "$JAVA_HOME"`
  [ -n "$CLASSPATH" ] &&
    CLASSPATH=`cygpath --path --unix "$CLASSPATH"`
fi

# For Migwn, ensure paths are in UNIX format before anything is touched
if $mingw ; then
  [ -n "$JAVA_HOME" ] &&
    JAVA_HOME="`(cd "$JAVA_HOME"; pwd)`"
  # TODO classpath?
fi

if [ -z "$JAVA_HOME" ]; then
  javaExecutable="`which javac`"
  if [ -n "$javaExecutable" -a ! "`expr \"$javaExecutable\" : '\([^ ]*\)'`" = "no" ]; then
    # readlink(1) is not available as standard on Solaris 10.
    readLink=`which readlink`
    if [ ! `expr "$readLink" : '\([^ ]*\)'` = "no" ]; then
      javaExecutable="`readlink -f \"$javaExecutable\"`"
      javaHome="`dirname \"$javaExecutable\"`"
      javaHome=`expr "$javaHome" : '\(.*\)/bin'`
      JAVA_HOME="$javaHome"
      export JAVA_HOME
    fi
  fi
fi

if [ -z "$JAVACMD" ] ; then
  if [ -n "$JAVA_HOME"  ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
      # IBM's JDK on AIX uses strange locations for the executables
      JAVACMD="$JAVA_HOME/jre/sh/java"
    else
      JAVACMD="$JAVA_HOME/bin/java"
    fi
  else
    JAVACMD="`which java`"
  fi
fi

if [ ! -x "$JAVACMD" ] ; then
  echo "Error: JAVA_HOME is not defined correctly."
  echo "  We cannot execute $JAVACMD"
  exit 1
fi

if [ -z "$JAVA_HOME" ] ; then
  echo "Warning: JAVA_HOME environment variable is not set."
fi

CLASSWORLDS_LAUNCHER=org.codehaus.plexus.classworlds.launcher.Launcher

# For Cygwin, switch paths to Windows format before running java
if $cygwin; then
  [ -n "$JAVA_HOME" ] &&
    JAVA_HOME=`cygpath --path --windows "$JAVA_HOME"`
  [ -n "$CLASSPATH" ] &&
    CLASSPATH=`cygpath --path --windows "$CLASSPATH"`
fi

#### END OF MAVEN'S CODE
#### JAVA_HOME is set at this point

[ -z "$JAVA_HOME" ] && echo "Could not determine JAVA_HOME, please set it." && exit 1

# there might be 2 version of libjvm.so one for client one for server
# we could improve here to prefere one or the other
PATH_TO_LIBJVM=`find $JAVA_HOME -name libjvm.so -print | head -n 1`
MATCH="/libjvm.so"

if $darwin ; then
  PATH_TO_LIBJVM=`find $JAVA_HOME -name libjvm.dylib -print | head -n 1`
  MATCH="/libjvm.dylib"
fi
if $cygwin ; then
  # do nothing as libname is libjvm.so
  echo ""
fi
if $mingw ; then
  echo "MINGW is not supported at the moment - Please create the symbolic link manually"
  exit 1
fi


# ! Do not be tempted to use ${PATH_TO_LIBJVM//$MATCH} as it does not work in bash compability mode
# because ${var/x/y/} construct is not POSIX
PATH_TO_LIB_SERVER="${PATH_TO_LIBJVM%$MATCH}"

if [ ! -L ./java_home_lib_server ]; then
  ln -s $PATH_TO_LIB_SERVER java_home_lib_server
  echo "The following symlink was created"
  echo ""
  ls -l java_home_lib_server
  echo ""
else
  echo "java_home_lib_server symlink already exist"
  ls -l java_home_lib_server
  echo "If you would like to override it with detected path"
  echo "run the following command manually:"
  echo ""
  echo "ln -s $PATH_TO_LIB_SERVER java_home_lib_server"
  echo ""
fi
