#include "main.hpp"

#include "log.hpp"
#include "main_window.hpp"

int APIENTRY wWinMain(HINSTANCE _instance, HINSTANCE _prev_instance, LPWSTR _cmdline, int _cmdshow)
{
    app::log_thread log_thread;
    app::main_window mw(_instance);

    if (!log_thread.run())
    {
		return 1;
    }

    if (!mw.init())
    {
        return 1;
    }

    auto rc = mw.loop();
	log_thread.stop();

    return rc;
}
