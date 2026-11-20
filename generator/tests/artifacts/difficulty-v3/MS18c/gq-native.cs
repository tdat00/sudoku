// MS18c Stage 3 task-owned native helper (compiled by gq-common.ps1 with Add-Type, before any admission sampling).
// It does exactly four things the .NET Process class cannot: create a process SUSPENDED with an explicit handle
// list (only the three given standard handles are inherited), put it into a NON-INHERITABLE KILL-ON-CLOSE Job
// Object (no breakaway flag, no named object, the controlling handle never leaves the supervisor), resume it,
// and query / terminate the job. Nothing here decides anything and nothing is started by loading it.
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public sealed class GqLaunch
{
    public int Pid;
    public IntPtr Process;
    public IntPtr Thread;
    public long CreationFileTime;
}

public static class GqNative
{
    const uint CREATE_SUSPENDED = 0x00000004;
    const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
    const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
    const uint CREATE_NO_WINDOW = 0x08000000;
    const int STARTF_USESTDHANDLES = 0x00000100;
    const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    const uint JOB_OBJECT_LIMIT_BREAKAWAY_OK = 0x00000800;
    const uint JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK = 0x00001000;
    const int JobObjectBasicAccountingInformation = 1;
    const int JobObjectBasicProcessIdList = 3;
    const int JobObjectExtendedLimitInformation = 9;
    const uint GENERIC_READ = 0x80000000;
    const uint GENERIC_WRITE = 0x40000000;
    const uint FILE_SHARE_READ_WRITE = 0x00000003;
    const uint OPEN_EXISTING = 3;
    const uint CREATE_NEW = 1;
    const uint FILE_ATTRIBUTE_NORMAL = 0x80;
    const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
    static readonly IntPtr PROC_THREAD_ATTRIBUTE_HANDLE_LIST = (IntPtr)0x00020002;
    static readonly IntPtr INVALID_HANDLE_VALUE = new IntPtr(-1);

    [StructLayout(LayoutKind.Sequential)]
    struct SECURITY_ATTRIBUTES
    {
        public int nLength;
        public IntPtr lpSecurityDescriptor;
        public int bInheritHandle;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
        public short wShowWindow, cbReserved2;
        public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct STARTUPINFOEX
    {
        public STARTUPINFO StartupInfo;
        public IntPtr lpAttributeList;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct PROCESS_INFORMATION
    {
        public IntPtr hProcess, hThread;
        public int dwProcessId, dwThreadId;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit, PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass, SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct IO_COUNTERS
    {
        public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount;
        public ulong ReadTransferCount, WriteTransferCount, OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_ACCOUNTING_INFORMATION
    {
        public long TotalUserTime, TotalKernelTime, ThisPeriodTotalUserTime, ThisPeriodTotalKernelTime;
        public uint TotalPageFaultCount, TotalProcesses, ActiveProcesses, TotalTerminatedProcesses;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool QueryInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length,
        out uint returned);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool TerminateJobObject(IntPtr job, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool CreateProcessW(string application, StringBuilder commandLine, IntPtr processAttributes,
        IntPtr threadAttributes, bool inheritHandles, uint flags, IntPtr environment, string currentDirectory,
        ref STARTUPINFOEX startup, out PROCESS_INFORMATION info);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint ResumeThread(IntPtr thread);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool TerminateProcess(IntPtr process, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr handle);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr CreateFileW(string name, uint access, uint share, ref SECURITY_ATTRIBUTES attributes,
        uint disposition, uint flags, IntPtr template);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute, IntPtr value,
        IntPtr size, IntPtr previous, IntPtr returnSize);

    [DllImport("kernel32.dll")]
    static extern void DeleteProcThreadAttributeList(IntPtr list);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int pid);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool GetProcessTimes(IntPtr process, out long creation, out long exit, out long kernel,
        out long user);

    static Win32Exception Fail(string what)
    {
        return new Win32Exception(Marshal.GetLastWin32Error(), what);
    }

    static IntPtr OpenInheritable(string path, bool write)
    {
        SECURITY_ATTRIBUTES sa = new SECURITY_ATTRIBUTES();
        sa.nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
        sa.bInheritHandle = 1;
        IntPtr h = write
            ? CreateFileW(path, GENERIC_WRITE, FILE_SHARE_READ_WRITE, ref sa, path == "NUL" ? OPEN_EXISTING : CREATE_NEW,
                FILE_ATTRIBUTE_NORMAL, IntPtr.Zero)
            : CreateFileW(path, GENERIC_READ, FILE_SHARE_READ_WRITE, ref sa, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL,
                IntPtr.Zero);
        if (h == INVALID_HANDLE_VALUE) throw Fail("cannot open " + path);
        return h;
    }

    /// <summary>An unnamed Job Object with KILL_ON_JOB_CLOSE and no breakaway; the handle is not inheritable.</summary>
    public static IntPtr CreateKillOnCloseJob()
    {
        IntPtr job = CreateJobObjectW(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw Fail("CreateJobObject");
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr buffer = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(info, buffer, false);
            if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, buffer, (uint)length))
            {
                Win32Exception error = Fail("SetInformationJobObject");
                CloseHandle(job);
                throw error;
            }
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
        return job;
    }

    /// <summary>The limit flags of the job that is queried (a handle) or, with IntPtr.Zero, of the calling process.</summary>
    public static string JobLimits(IntPtr job)
    {
        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr buffer = Marshal.AllocHGlobal(length);
        try
        {
            uint returned;
            if (!QueryInformationJobObject(job, JobObjectExtendedLimitInformation, buffer, (uint)length, out returned))
                return "none: " + new Win32Exception(Marshal.GetLastWin32Error()).Message;
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION info =
                (JOBOBJECT_EXTENDED_LIMIT_INFORMATION)Marshal.PtrToStructure(buffer,
                    typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
            uint flags = info.BasicLimitInformation.LimitFlags;
            return "limitFlags=0x" + flags.ToString("X") + ";killOnClose=" + ((flags & JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE) != 0) +
                ";breakawayOk=" + ((flags & JOB_OBJECT_LIMIT_BREAKAWAY_OK) != 0) + ";silentBreakawayOk=" +
                ((flags & JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK) != 0) + ";activeProcessLimit=" +
                info.BasicLimitInformation.ActiveProcessLimit;
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    /// <summary>True when the process is in any job (job == IntPtr.Zero) or in the given job.</summary>
    public static bool InJob(IntPtr process, IntPtr job)
    {
        bool result;
        if (!IsProcessInJob(process, job, out result)) throw Fail("IsProcessInJob");
        return result;
    }

    public static IntPtr CurrentProcess()
    {
        return System.Diagnostics.Process.GetCurrentProcess().Handle;
    }

    /// <summary>The QueryPerformanceCounter ticks (the clock of Node's process.hrtime) and their nanoseconds.</summary>
    public static long NowTicks()
    {
        return System.Diagnostics.Stopwatch.GetTimestamp();
    }

    public static long Frequency()
    {
        return System.Diagnostics.Stopwatch.Frequency;
    }

    public static long TicksToNs(long ticks)
    {
        return (long)((decimal)ticks * 1000000000m / (decimal)System.Diagnostics.Stopwatch.Frequency);
    }

    /// <summary>True when the process with this id (opened for a limited query) belongs to the given job.</summary>
    public static bool PidInJob(int pid, IntPtr job)
    {
        IntPtr h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
        if (h == IntPtr.Zero) return false;
        try
        {
            bool result;
            return IsProcessInJob(h, job, out result) && result;
        }
        finally
        {
            CloseHandle(h);
        }
    }

    /// <summary>Waits up to the given milliseconds for the created process to exit; true when it has exited.</summary>
    public static bool WaitExit(GqLaunch launch, uint milliseconds)
    {
        return WaitForSingleObject(launch.Process, milliseconds) == 0;
    }

    /// <summary>
    /// Creates the process suspended; only stdin (NUL), stdout and stderr are inherited (explicit handle list). The
    /// output paths are created new (an existing file is an error: records are never overwritten) or are "NUL".
    /// </summary>
    public static GqLaunch CreateSuspended(string application, string commandLine, string directory,
        string[] environment, string stdoutPath, string stderrPath)
    {
        IntPtr hIn = IntPtr.Zero, hOut = IntPtr.Zero, hErr = IntPtr.Zero, attributes = IntPtr.Zero;
        IntPtr handleList = IntPtr.Zero, env = IntPtr.Zero;
        bool listReady = false;
        try
        {
            hIn = OpenInheritable("NUL", false);
            hOut = OpenInheritable(stdoutPath, true);
            hErr = stderrPath == stdoutPath ? hOut : OpenInheritable(stderrPath, true);
            IntPtr size = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
            attributes = Marshal.AllocHGlobal(size);
            if (!InitializeProcThreadAttributeList(attributes, 1, 0, ref size)) throw Fail("InitializeProcThreadAttributeList");
            listReady = true;
            IntPtr[] handles = hErr == hOut ? new IntPtr[] { hIn, hOut } : new IntPtr[] { hIn, hOut, hErr };
            handleList = Marshal.AllocHGlobal(IntPtr.Size * handles.Length);
            for (int i = 0; i < handles.Length; i++) Marshal.WriteIntPtr(handleList, i * IntPtr.Size, handles[i]);
            if (!UpdateProcThreadAttribute(attributes, 0, PROC_THREAD_ATTRIBUTE_HANDLE_LIST, handleList,
                (IntPtr)(IntPtr.Size * handles.Length), IntPtr.Zero, IntPtr.Zero))
                throw Fail("UpdateProcThreadAttribute");

            StringBuilder block = new StringBuilder();
            foreach (string pair in environment) block.Append(pair).Append('\0');
            block.Append('\0');
            env = Marshal.StringToHGlobalUni(block.ToString());

            STARTUPINFOEX startup = new STARTUPINFOEX();
            startup.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
            startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
            startup.StartupInfo.hStdInput = hIn;
            startup.StartupInfo.hStdOutput = hOut;
            startup.StartupInfo.hStdError = hErr;
            startup.lpAttributeList = attributes;
            PROCESS_INFORMATION info;
            uint flags = CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | EXTENDED_STARTUPINFO_PRESENT | CREATE_NO_WINDOW;
            if (!CreateProcessW(application, new StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, true, flags, env,
                directory, ref startup, out info))
                throw Fail("CreateProcess");
            GqLaunch launch = new GqLaunch();
            launch.Pid = info.dwProcessId;
            launch.Process = info.hProcess;
            launch.Thread = info.hThread;
            long creation, exit, kernel, user;
            GetProcessTimes(info.hProcess, out creation, out exit, out kernel, out user);
            launch.CreationFileTime = creation;
            return launch;
        }
        finally
        {
            if (listReady) DeleteProcThreadAttributeList(attributes);
            if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
            if (handleList != IntPtr.Zero) Marshal.FreeHGlobal(handleList);
            if (env != IntPtr.Zero) Marshal.FreeHGlobal(env);
            if (hIn != IntPtr.Zero && hIn != INVALID_HANDLE_VALUE) CloseHandle(hIn);
            if (hOut != IntPtr.Zero && hOut != INVALID_HANDLE_VALUE) CloseHandle(hOut);
            if (hErr != IntPtr.Zero && hErr != hOut && hErr != INVALID_HANDLE_VALUE) CloseHandle(hErr);
        }
    }

    /// <summary>Puts the suspended process into the job; on failure the process is terminated and the call throws.</summary>
    public static void AssignToJob(IntPtr job, GqLaunch launch)
    {
        if (!AssignProcessToJobObject(job, launch.Process))
        {
            Win32Exception error = Fail("AssignProcessToJobObject");
            TerminateProcess(launch.Process, 1);
            throw error;
        }
    }

    public static void Resume(GqLaunch launch)
    {
        if (ResumeThread(launch.Thread) == 0xFFFFFFFF) throw Fail("ResumeThread");
    }

    public static void Terminate(GqLaunch launch)
    {
        TerminateProcess(launch.Process, 1);
    }

    public static void TerminateJob(IntPtr job, uint exitCode)
    {
        if (!TerminateJobObject(job, exitCode)) throw Fail("TerminateJobObject");
    }

    public static int ActiveProcesses(IntPtr job)
    {
        int length = Marshal.SizeOf(typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION));
        IntPtr buffer = Marshal.AllocHGlobal(length);
        try
        {
            uint returned;
            if (!QueryInformationJobObject(job, JobObjectBasicAccountingInformation, buffer, (uint)length, out returned))
                throw Fail("QueryInformationJobObject(accounting)");
            JOBOBJECT_BASIC_ACCOUNTING_INFORMATION info =
                (JOBOBJECT_BASIC_ACCOUNTING_INFORMATION)Marshal.PtrToStructure(buffer,
                    typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION));
            return (int)info.ActiveProcesses;
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    /// <summary>The ids of the processes in the job (at most 256 are listed).</summary>
    public static int[] ProcessIds(IntPtr job)
    {
        int slots = 256;
        int length = 8 + IntPtr.Size * slots;
        IntPtr buffer = Marshal.AllocHGlobal(length);
        try
        {
            uint returned;
            if (!QueryInformationJobObject(job, JobObjectBasicProcessIdList, buffer, (uint)length, out returned))
                throw Fail("QueryInformationJobObject(process ids)");
            int count = Marshal.ReadInt32(buffer, 4);
            int[] ids = new int[count];
            for (int i = 0; i < count; i++) ids[i] = (int)Marshal.ReadIntPtr(buffer, 8 + i * IntPtr.Size).ToInt64();
            return ids;
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    public static bool HasExited(GqLaunch launch)
    {
        return WaitForSingleObject(launch.Process, 0) == 0;
    }

    public static int ExitCode(GqLaunch launch)
    {
        uint code;
        if (!GetExitCodeProcess(launch.Process, out code)) throw Fail("GetExitCodeProcess");
        return unchecked((int)code);
    }

    public static void Close(IntPtr handle)
    {
        if (handle != IntPtr.Zero) CloseHandle(handle);
    }

    public static void Release(GqLaunch launch)
    {
        Close(launch.Thread);
        Close(launch.Process);
    }

    /// <summary>The creation FILETIME (100 ns ticks since 1601) of any process the caller may query, or 0.</summary>
    public static long CreationFileTimeOf(int pid)
    {
        IntPtr h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
        if (h == IntPtr.Zero) return 0;
        try
        {
            long creation, exit, kernel, user;
            return GetProcessTimes(h, out creation, out exit, out kernel, out user) ? creation : 0;
        }
        finally
        {
            CloseHandle(h);
        }
    }
}
